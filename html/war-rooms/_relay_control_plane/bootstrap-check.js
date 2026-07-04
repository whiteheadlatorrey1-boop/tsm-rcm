(function(){
  function check(){
    const guard = document.querySelector("script[src*='relay.guard']");
    const norm = document.querySelector("script[src*='relay.normalize']");
    if(!guard || !norm){
      console.warn("TSM CONTROL PLANE: INCOMPLETE INJECTION");
    } else {
      console.log("TSM CONTROL PLANE: ACTIVE");
    }
  }
  if(document.readyState !== "loading") check();
  else document.addEventListener("DOMContentLoaded", check);
})();
