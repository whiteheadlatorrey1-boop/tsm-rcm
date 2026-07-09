
const fs=require("fs");


const BASE="data/mdm-memory";


function append(file,data){

    let current=[];

    try{

        current =
        JSON.parse(
            fs.readFileSync(
                `${BASE}/${file}`
            )
        );

    }catch(e){}


    current.push(data);


    fs.writeFileSync(
        `${BASE}/${file}`,
        JSON.stringify(current,null,2)
    );

}


module.exports={

saveDecision(data){

append(
"previous-decisions.json",
data
);

},


saveStewardAction(data){

append(
"steward-actions.json",
data
);

}

};

