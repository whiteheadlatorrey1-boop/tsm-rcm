window.TSMNotificationEngine = {

send(notification){

console.log(
"Notification",
notification
);

return {

status:"SENT",

recipient:notification.recipient

};

}

};
