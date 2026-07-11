window.TSMApiGateway={

 routes:{},

 register(route,handler){

  this.routes[route]=handler;

 }

};