module.exports = {

  getCommandCenter(){

    return {

      portfolio:{
        activeLoans:12482,
        pipelineValue:4800000000,
        closingThisWeek:1024,
        atRisk:87,
        clearToClose:642
      },

      performance:{
        avgCloseDays:16,
        targetCloseDays:15,
        qcScore:98
      },

      alerts:[
        {
          type:"DOCUMENT_DELAY",
          loans:47,
          impact:"$1.2M pipeline exposure",
          recommendation:
          "Deploy Processor Copilot"
        }
      ],

      forecast:{
        today:87,
        tomorrow:104,
        friday:132
      }

    };

  }

};
