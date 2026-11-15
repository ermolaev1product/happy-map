package ge.morrow.app;

/** Local UI strings only. No storage, permissions or network behavior. */
final class NativeText {
    static String normalize(String value) {
        if (value == null) return "en";
        String v = value.toLowerCase(java.util.Locale.ROOT).replace("_", "-");
        if (v.startsWith("pt")) return "pt-br";
        for (String lang : new String[]{"ru", "en", "sr", "es", "de"})
            if (v.equals(lang) || v.startsWith(lang + "-")) return lang;
        return "en";
    }
    static String text(String language, String key) {
        int i;
        switch (key) {
            case "openTitle": i = 0; break;
            case "openMessage": i = 1; break;
            case "retry": i = 2; break;
            case "nearby": i = 3; break;
            case "location": i = 4; break;
            case "continue": i = 5; break;
            case "notNow": i = 6; break;
            case "noDialer": i = 7; break;
            case "noBrowser": i = 8; break;
            case "updateTitle": i = 9; break;
            case "updateMessage": i = 10; break;
            case "later": i = 11; break;
            case "openUpdate": i = 12; break;
            default: throw new IllegalArgumentException("Unknown UI text key");
        }
        switch (normalize(language)) {
            case "ru": return new String[]{"Не удалось открыть Happy Map", "Попробуйте открыть приложение ещё раз.", "Повторить", "Что рядом с тобой?", "Разреши Happy Map определить местоположение, чтобы показать события поблизости. Можно выбрать приблизительное местоположение. Координаты не сохраняются в аккаунте; фонового отслеживания нет.", "Продолжить", "Не сейчас", "На устройстве нет приложения для звонков", "Установите браузер, чтобы открыть ссылку", "Обновление Happy Map", "Доступна новая версия. Установите её поверх текущей, чтобы сохранить планы.", "Позже", "Открыть обновление"}[i];
            case "en": return new String[]{"Could not open Happy Map", "Try opening the app again.", "Retry", "What’s near you?", "Allow Happy Map to use your location to show nearby events. You can choose approximate location. Coordinates are not saved to your account; there is no background tracking.", "Continue", "Not now", "No calling app is installed on this device", "Install a browser to open this link", "Happy Map update", "A new version is available. Install it over the current app to keep your plans.", "Later", "Open update"}[i];
            case "sr": return new String[]{"Nije moguće otvoriti Happy Map", "Pokušaj ponovo da otvoriš aplikaciju.", "Pokušaj ponovo", "Šta je u tvojoj blizini?", "Dozvoli aplikaciji Happy Map da koristi tvoju lokaciju da prikaže događaje u blizini. Možeš izabrati približnu lokaciju. Koordinate se ne čuvaju na tvom nalogu; nema praćenja u pozadini.", "Nastavi", "Ne sada", "Na uređaju nije instalirana aplikacija za pozive", "Instaliraj pregledač da otvoriš ovaj link", "Ažuriranje aplikacije Happy Map", "Dostupna je nova verzija. Instaliraj je preko postojeće aplikacije da sačuvaš planove.", "Kasnije", "Otvori ažuriranje"}[i];
            case "es": return new String[]{"No se pudo abrir Happy Map", "Intenta abrir la aplicación de nuevo.", "Reintentar", "¿Qué hay cerca de ti?", "Permite que Happy Map use tu ubicación para mostrar eventos cercanos. Puedes elegir una ubicación aproximada. Las coordenadas no se guardan en tu cuenta; no hay seguimiento en segundo plano.", "Continuar", "Ahora no", "No hay una aplicación de llamadas instalada en este dispositivo", "Instala un navegador para abrir este enlace", "Actualización de Happy Map", "Hay una nueva versión disponible. Instálala sobre la aplicación actual para conservar tus planes.", "Más tarde", "Abrir actualización"}[i];
            case "de": return new String[]{"Happy Map konnte nicht geöffnet werden", "Versuche, die App erneut zu öffnen.", "Erneut versuchen", "Was ist in deiner Nähe?", "Erlaube Happy Map, deinen Standort zu verwenden, um Veranstaltungen in der Nähe anzuzeigen. Du kannst einen ungefähren Standort wählen. Die Koordinaten werden nicht in deinem Konto gespeichert; es gibt keine Standortverfolgung im Hintergrund.", "Weiter", "Nicht jetzt", "Auf diesem Gerät ist keine Telefon-App installiert", "Installiere einen Browser, um diesen Link zu öffnen", "Happy Map aktualisieren", "Eine neue Version ist verfügbar. Installiere sie über die bestehende App, damit deine Pläne erhalten bleiben.", "Später", "Update öffnen"}[i];
            case "pt-br": return new String[]{"Não foi possível abrir o Happy Map", "Tente abrir o aplicativo novamente.", "Tentar novamente", "O que tem perto de você?", "Permita que o Happy Map use sua localização para mostrar eventos próximos. Você pode escolher uma localização aproximada. As coordenadas não são salvas na sua conta; não há rastreamento em segundo plano.", "Continuar", "Agora não", "Não há um aplicativo de chamadas instalado neste dispositivo", "Instale um navegador para abrir este link", "Atualização do Happy Map", "Uma nova versão está disponível. Instale-a sobre o aplicativo atual para manter seus planos.", "Mais tarde", "Abrir atualização"}[i];
            default: throw new IllegalStateException("Unknown normalized language");
        }
    }
}
