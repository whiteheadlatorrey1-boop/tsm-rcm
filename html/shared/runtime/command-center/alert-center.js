window.TSMAlertCenter = {

alerts:[],

create(alert){

this.alerts.push({

timestamp:
new Date().toISOString(),

alert

});

}

};