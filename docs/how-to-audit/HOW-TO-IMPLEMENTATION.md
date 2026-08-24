# TSM How-To Workflow Engine

## Purpose

The TSM How-To layer converts application functionality into a guided business workflow.

The standard is:

**PROBLEM → START → INPUT → ANALYZE → REVIEW → DECIDE → EXECUTE → REPORT → MEASURE**

## Architecture

### Workflow Registry

`server/how-to/workflow-registry.js`

Defines what a user should do inside each vertical workflow.

### Report Registry

`server/how-to/report-registry.js`

Defines reports around business questions rather than generic exports.

### Pain-Point Registry

`server/how-to/painpoint-registry.js`

Defines the business problem the user is attempting to solve.

### How-To Engine

`server/how-to/how-to-engine.js`

Combines workflow, reports and pain points into a contextual guide.

### Browser Component

`html/shared/tsm-how-to.js`

Renders the guide inside application pages.

### Styles

`html/shared/tsm-how-to.css`

Provides the reusable presentation layer.

## Initial Vertical Workflows

- Healthcare — Denial Recovery
- Healthcare — Revenue Cycle
- Construction — Project Risk
- Mortgage — Loan Pipeline
- Real Estate — Property Operations
- Insurance — Claims Risk
- FinOps — Financial Exceptions
- Legal — Matter Risk
- BPO — Operations
- ITOps — Incident Management
- Schools — Compliance
- Hotel — Operations

## User Experience

The guide should answer:

1. What problem am I solving?
2. Where do I start?
3. What do I provide?
4. What does TSM analyze?
5. What should I review?
6. What decision should I make?
7. What action should I execute?
8. What report should I generate?
9. How do I measure the result?

## Report Philosophy

Reports are presented as answers to business questions:

- Where are we losing money?
- What needs attention now?
- What should the team work first?
- What is blocking the workflow?
- What does leadership need to know?

## Future Integration

The How-To layer should eventually emit workflow telemetry:

`workflow_started`

`input_loaded`

`analysis_run`

`finding_reviewed`

`decision_made`

`action_executed`

`report_generated`

`outcome_recorded`

This allows TSM to demonstrate operational value rather than simply documenting application features.
