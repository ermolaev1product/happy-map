package ge.morrow.app;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.*;
import android.widget.FrameLayout;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/** Local HTTPS-origin shell. No JavaScript bridge, remote app code or embedded credentials. */
public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String ORIGIN = "https://" + HOST;
    private static final String HOME = ORIGIN + "/app-start.html";
    private WebView web;
    private long lastUpdateCheck=0;
    private int offeredUpdate=0;
    private GeolocationPermissions.Callback locationCallback;
    private String locationOrigin;
    private Set<String> publishedCatalogPaths = Collections.emptySet();
    private static final int MAX_CATALOG_BYTES = 32 * 1024 * 1024;
    private String appUserAgent;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        publishedCatalogPaths = loadCatalogPaths();
        try { appUserAgent = "HappyMapAndroid/" + getPackageManager().getPackageInfo(getPackageName(), 0).versionName; }
        catch (PackageManager.NameNotFoundException e) { appUserAgent = "HappyMapAndroid"; }
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.WHITE);
        setContentView(root);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((v, insets) -> {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return insets;
            });
        }
        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        web.setBackgroundColor(Color.WHITE);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setGeolocationEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setUserAgentString(settings.getUserAgentString() + " " + appUserAgent);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!HOST.equals(uri.getHost())) return null;
                if (!"https".equals(uri.getScheme()) || !"GET".equals(request.getMethod())) return missing();
                String path = uri.getPath();
                if (path != null && path.startsWith("/live/")) return publishedCatalog(path.substring(6));
                if (path == null || path.equals("/")) path = "/index.html";
                // APK assets only; traversal and unsupported filenames never reach the network.
                if (!path.matches("/[A-Za-z0-9_./-]+") || path.contains("..")) return missing();
                if (path.endsWith("/")) path += "index.html";
                String name = path.substring(1);
                String type = name.endsWith(".html") ? "text/html" : name.endsWith(".js") ? "application/javascript" : name.endsWith(".css") ? "text/css" : name.endsWith(".json") ? "application/json" : name.endsWith(".svg") ? "image/svg+xml" : name.endsWith(".png") ? "image/png" : name.endsWith(".jpg") ? "image/jpeg" : "text/plain";
                try { return new WebResourceResponse(type, "UTF-8", 200, "OK", Collections.singletonMap("X-Content-Type-Options", "nosniff"), getAssets().open(name)); }
                catch (IOException e) { return missing(); }
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (url.startsWith(ORIGIN + "/")) view.evaluateJavascript("(()=>{if(window.happyMapLinksBound)return;window.happyMapLinksBound=true;document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(a&&/^(https?:|tel:)/.test(a.getAttribute('href')))a.removeAttribute('target');},true);})()", null);
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return navigate(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return navigate(Uri.parse(url));
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) new AlertDialog.Builder(MainActivity.this).setTitle("Не удалось открыть Happy Map").setMessage("Попробуйте открыть приложение ещё раз.").setPositiveButton("Повторить", (d,w) -> web.loadUrl(HOME)).show();
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (!(ORIGIN.equals(origin) || (ORIGIN + "/").equals(origin))) { callback.invoke(origin, false, false); return; }
                if (hasLocation()) { callback.invoke(origin, true, false); return; }
                if (locationCallback != null) locationCallback.invoke(locationOrigin, false, false);
                locationCallback = callback; locationOrigin = origin;
                new AlertDialog.Builder(MainActivity.this).setTitle("Что рядом с тобой?")
                    .setMessage("Разреши Happy Map определить местоположение, чтобы показать события поблизости. Можно выбрать приблизительное местоположение. Координаты не сохраняются в аккаунте; фонового отслеживания нет.")
                    .setPositiveButton("Продолжить", (d,w) -> requestPermissions(new String[]{Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION}, 7))
                    .setNegativeButton("Не сейчас", (d,w) -> resolveLocation(false))
                    .setOnCancelListener(d -> resolveLocation(false)).show();
            }
            @Override public void onGeolocationPermissionsHidePrompt() { resolveLocation(false); }
        });
        if (Build.VERSION.SDK_INT >= 33) getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBack);
        web.loadUrl(HOME);
    }
    // Generated from the bundled city registry, never from a remote page or URL.
    // Failure is closed: only bundled data is then available.
    private Set<String> loadCatalogPaths() {
        try (java.io.InputStream in = getAssets().open("android-catalogs.json")) {
            java.io.ByteArrayOutputStream bytes = new java.io.ByteArrayOutputStream();
            byte[] buffer = new byte[4096]; int count;
            while ((count = in.read(buffer)) != -1) {
                if (bytes.size() + count > 131072) return Collections.emptySet();
                bytes.write(buffer, 0, count);
            }
            org.json.JSONObject manifest = new org.json.JSONObject(bytes.toString("UTF-8"));
            if (manifest.getInt("schemaVersion") != 1 || manifest.getInt("maxCatalogBytes") != MAX_CATALOG_BYTES) return Collections.emptySet();
            org.json.JSONArray paths = manifest.getJSONArray("paths");
            if (paths.length() > 3000) return Collections.emptySet();
            Set<String> allowed = new HashSet<>();
            for (int i = 0; i < paths.length(); i++) {
                String path = paths.getString(i);
                if (!path.matches("(?:(?:en|de)/)?(?:[a-z]+(?:-[a-z]+)*/)?(?:events|places)\\.json")) return Collections.emptySet();
                allowed.add(path);
            }
            return Collections.unmodifiableSet(allowed);
        } catch (Exception e) { return Collections.emptySet(); }
    }
    // Fixed HTTPS host, exact data-only paths and bounded payloads; no remote app code.
    private WebResourceResponse publishedCatalog(String path) {
        if (!publishedCatalogPaths.contains(path)) return missing();
        javax.net.ssl.HttpsURLConnection connection = null;
        try {
            java.net.URL url = new java.net.URL("https://happymap.app/" + path);
            connection = (javax.net.ssl.HttpsURLConnection) url.openConnection();
            connection.setConnectTimeout(4000); connection.setReadTimeout(12000);
            connection.setUseCaches(false);
            connection.setInstanceFollowRedirects(false);
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("User-Agent", appUserAgent);
            if (connection.getResponseCode() != 200) return missing();
            String type=connection.getContentType();
            if (type == null || !type.toLowerCase(java.util.Locale.ROOT).contains("application/json")) return missing();
            java.io.ByteArrayOutputStream bytes = new java.io.ByteArrayOutputStream();
            try (java.io.InputStream in = connection.getInputStream()) {
                byte[] buffer = new byte[8192]; int count;
                while ((count=in.read(buffer)) != -1) {
                    if (bytes.size()+count>MAX_CATALOG_BYTES) return missing();
                    bytes.write(buffer,0,count);
                }
            }
            return new WebResourceResponse("application/json", "UTF-8", 200, "OK", Collections.singletonMap("Cache-Control", "no-store"), new ByteArrayInputStream(bytes.toByteArray()));
        } catch (Exception e) { return missing(); }
        finally { if (connection != null) connection.disconnect(); }
    }
    private static WebResourceResponse missing() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }
    private boolean navigate(Uri uri) {
        if ("https".equals(uri.getScheme()) && HOST.equals(uri.getHost())) return false;
        if ("tel".equals(uri.getScheme())) {
            try { startActivity(new Intent(Intent.ACTION_DIAL, uri)); }
            catch (ActivityNotFoundException e) { Toast.makeText(this, "На устройстве нет приложения для звонков", Toast.LENGTH_LONG).show(); }
            return true;
        }
        if ("https".equals(uri.getScheme()) || "http".equals(uri.getScheme())) {
            try { startActivity(new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE)); }
            catch (ActivityNotFoundException e) { Toast.makeText(this, "Установите браузер, чтобы открыть ссылку", Toast.LENGTH_LONG).show(); }
        }
        return true;
    }
    private void checkAppUpdate() {
        if (System.currentTimeMillis()-lastUpdateCheck < 3600000) return;
        lastUpdateCheck=System.currentTimeMillis();
        new Thread(() -> {
            javax.net.ssl.HttpsURLConnection connection=null;
            try {
                connection=(javax.net.ssl.HttpsURLConnection)new java.net.URL("https://happymap.app/android-release.json").openConnection();
                connection.setConnectTimeout(5000);connection.setReadTimeout(5000);connection.setUseCaches(false);connection.setInstanceFollowRedirects(false);
                if(connection.getResponseCode()!=200)return;
                java.io.ByteArrayOutputStream bytes=new java.io.ByteArrayOutputStream();
                try(java.io.InputStream in=connection.getInputStream()) {
                    byte[] buffer=new byte[1024];int n;
                    while((n=in.read(buffer))!=-1){if(bytes.size()+n>16384)return;bytes.write(buffer,0,n);}
                }
                org.json.JSONObject release=new org.json.JSONObject(bytes.toString("UTF-8"));
                int next=release.getInt("versionCode");
                int installed=getPackageManager().getPackageInfo(getPackageName(),0).versionCode;
                if(!getPackageName().equals(release.getString("package"))||next<=installed)return;
                runOnUiThread(()->{
                    if(isFinishing()||isDestroyed()||next<=offeredUpdate)return;
                    offeredUpdate=next;
                    new AlertDialog.Builder(this).setTitle("Обновление Happy Map")
                        .setMessage("Доступна новая версия. Установите её поверх текущей, чтобы сохранить планы.")
                        .setNegativeButton("Позже",null)
                        .setPositiveButton("Открыть обновление",(d,w)->navigate(Uri.parse("https://happymap.app/android.html"))).show();
                });
            }catch(Exception ignored){}finally{if(connection!=null)connection.disconnect();}
        }).start();
    }
    private boolean hasLocation() { return checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED || checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED; }
    private void resolveLocation(boolean allow) {
        if (locationCallback != null) { locationCallback.invoke(locationOrigin, allow, false); locationCallback = null; locationOrigin = null; }
    }
    @Override public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(code, permissions, results);
        if (code == 7) resolveLocation(hasLocation());
    }
    private void handleBack() {
        web.evaluateJavascript("(()=>{if(window.morrowGoBack&&window.morrowGoBack())return true;const d=document.querySelector('dialog[open]');if(d){d.close();return true;}if(document.body.classList.contains('plan-view')){document.getElementById('mobileExplore').click();return true;}return false;})()", handled -> { if (!"true".equals(handled)) { if(web.canGoBack()) web.goBack(); else finish(); } });
    }
    @Override public void onBackPressed() { handleBack(); }
    @Override protected void onPause() { web.onPause(); super.onPause(); }
    @Override protected void onResume() { super.onResume(); checkAppUpdate(); if (web != null) { web.onResume(); web.evaluateJavascript("window.happyMapRefresh && window.happyMapRefresh()", null); } }
    @Override protected void onDestroy() { resolveLocation(false); web.destroy(); super.onDestroy(); }
}
