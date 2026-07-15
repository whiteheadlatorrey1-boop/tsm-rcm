window.TSMIntake = window.TSMIntake || {

    sectors:{},

    registerSector:function(config){
        this.sectors[config.id]=config;
    },

    getSector:function(id){
        return this.sectors[id];
    },

    list:function(){
        return Object.keys(this.sectors);
    }

};
