

const express=require("express");

const router=express.Router();


const {
detectMortgage
}=require("./mortgage-router");


const {
createMortgageMission
}=require("./mortgage-mission");



router.post("/classify",(req,res)=>{


const result =
detectMortgage(req.body);


if(!result){

return res.json({

matched:false

});

}


res.json({

matched:true,

classification:
result,

mission:
createMortgageMission(req.body)

});


});



module.exports=router;

