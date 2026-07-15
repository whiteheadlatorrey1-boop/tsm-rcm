

module.exports={


publish(event){


return {


event,


timestamp:
new Date().toISOString(),


status:
"RECORDED"


};


}


};


