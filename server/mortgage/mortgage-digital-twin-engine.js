module.exports = {
  snapshot(){
    return {
      pipeline:{
        applications:342,
        processing:221,
        underwriting:87,
        closing:34,
        funded:27
      },
      bottlenecks:[
        "Income verification",
        "Missing documentation"
      ],
      aiRecommendation:
        "Prioritize high-risk underwriting queue"
    };
  }
};
