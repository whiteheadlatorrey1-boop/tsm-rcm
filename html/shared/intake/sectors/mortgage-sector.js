window.TSMIntake = window.TSMIntake || {registerSector:function(){}};


TSMIntake.registerSector({

    id:"mortgage",

    title:"TSM Mortgage Rescue Pack",

    type:"MORTGAGE",

    rescuePacks:[

        "loan-denial",
        "credit-event",
        "employment-change",
        "asset-sourcing",
        "income-stability",
        "fraud-investigation",
        "fha-rescue",
        "va-rescue",
        "usda-rescue",
        "jumbo-rescue",
        "dscr-investor",
        "trid-rescue",
        "respa-rescue",
        "hmda-audit",
        "mortgage-ops-scorecard"

    ],

    routing:{

        warRoom:
        "/html/war-rooms/mortgage/mortgage-war-room.html",

        strategist:
        "/html/war-rooms/mortgage/mortgage-strategist.html",

        executive:
        "/html/war-rooms/mortgage/mortgage-executive-portal.html"

    }

});
