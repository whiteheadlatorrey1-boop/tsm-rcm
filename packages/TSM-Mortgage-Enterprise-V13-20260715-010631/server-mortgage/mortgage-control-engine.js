function handoff(decision){

return {
    aiRecommendation:decision,
    humanReviewRequired:true,
    approvalState:"PENDING_REVIEW"
};

}

module.exports={handoff};
