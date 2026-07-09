'use strict';

module.exports = {

    route(vertical){

        switch((vertical||'').toLowerCase()){

            case 'healthcare':

                return [
                    'crm',
                    'approval',
                    'mdm',
                    'governance',
                    'digital-twin'
                ];

            case 'legal':

                return [
                    'crm',
                    'approval',
                    'mdm',
                    'governance'
                ];

            case 'construction':

                return [
                    'o2c',
                    'crm',
                    'cpq',
                    'catalog',
                    'approval',
                    'mdm',
                    'integration',
                    'governance',
                    'wip',
                    'digital-twin'
                ];

            default:

                return [
                    'crm'
                ];

        }

    }

};