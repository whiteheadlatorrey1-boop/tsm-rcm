
(function(){

const params =
new URLSearchParams(window.location.search);


const sectorId =
params.get("sector");


if(
window.TSMIntake &&
sectorId
){

const sector =
TSMIntake.getSector(sectorId);


if(sector){

window.TSM_ACTIVE_SECTOR=sector;


console.log(
"TSM Sector Loaded:",
sector.title
);


}

}

})();

