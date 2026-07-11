window.TSMMissionStore = {

missions:[],

add(mission){

this.missions.push(mission);

return mission;

},

all(){

return this.missions;

}

};
