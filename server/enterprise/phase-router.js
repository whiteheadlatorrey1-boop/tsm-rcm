'use strict';

// ============================================================
// DEAD CODE — not required anywhere in this repo (verified via
// full-repo grep). Do not wire this into enterprise-engine.js's
// loadCapabilities() as-is: it only has real cases for healthcare,
// legal, and construction. Every other vertical -- including bpo,
// mortgage, insurance, finops, and real_estate -- falls through to
// the default case below and would get just ['crm'], cutting a
// 10-module enrichment down to 1.
//
// The vertical-scoping problem this file was apparently meant to
// solve is already solved correctly elsewhere: domain-map.js
// (required by enterprise-router.js, used in reshapeForClient() on
// every response) keeps all 10 modules running for every vertical
// and relabels them into that vertical's own language instead of
// filtering the module set. That's the live, correct system --
// see domain-map.js's own header comment. This file predates or
// duplicates that decision and was never finished or connected.
// ============================================================

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