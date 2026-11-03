(() => {
 try{sessionStorage.setItem('happymap-telegram-session','1')}catch{}
 const params=new URLSearchParams(location.search);params.set('miniapp','telegram');
 location.replace('/app-start.html?'+params+location.hash);
})();
