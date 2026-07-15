

function routeMission(industry){

const routes =
require("./war-room-map.json");


return routes[industry]
||
{

warRoom:
"html/war-rooms/general-war-room.html"

};

}


module.exports={
routeMission
};

