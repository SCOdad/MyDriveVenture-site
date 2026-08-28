// Public configuration only. No secrets belong in browser JavaScript.
window.DV_FEEDBACK_ENDPOINT = window.DV_ENVIRONMENT_CONFIG.functionUrl('public-feedback');
window.DV_FEEDBACK_ATTACHMENT_ENDPOINT = window.DV_ENVIRONMENT_CONFIG.functionUrl('feedback-attachment-upload');
window.DV_OPERATOR_FEEDBACK_ENDPOINT = window.DV_ENVIRONMENT_CONFIG.functionUrl('operator-feedback');
window.DV_PROJECT_STATE = 'ALPHA';
// Source revision containing the released feedback/operator experience.
window.DV_CODE_REVISION = 'cc55ec20e82b212f4f5fd957ec14827dd063b232';
