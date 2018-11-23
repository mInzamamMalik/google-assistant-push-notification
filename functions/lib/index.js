"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// process.env.DEBUG = 'actions-on-google:*';
const functions = require("firebase-functions");
const { DialogflowApp } = require('actions-on-google');
const r = require("request");
const googleapis_1 = require("googleapis");
const serviceAccount = require('./home-push-notification-firebase-adminsdk-amy7g-7a2584a6d5.json');
const Actions = {
    UNRECOGNIZED_DEEP_LINK: 'deeplink.unknown',
    WELCOME: 'input.welcome',
    SETUP_PUSH: 'setup.push',
    FINISH_PUSH_SETUP: 'finish.push.setup'
};
const Parameters = {
    CATEGORY: 'category',
    UPDATE_INTENT: 'UPDATE_INTENT'
};
const PUSH_NOTIFICATION_ASKED = 'push_notification_asked';
exports.webhook = functions.https.onRequest((request, response) => {
    try {
        const app = new DialogflowApp({ request, response });
        console.log('Request headers: ' + JSON.stringify(request.headers));
        console.log('Request body: ' + JSON.stringify(request.body));
        // Map of action from Dialogflow to handling function
        const actionMap = new Map();
        actionMap.set(Actions.WELCOME, welcome);
        actionMap.set(Actions.SETUP_PUSH, setupPush);
        actionMap.set(Actions.FINISH_PUSH_SETUP, finishPushSetup);
        app.handleRequest(actionMap);
    }
    catch (e) {
        console.log("catch error: ", e);
        response.send({
            speech: "no intent matched"
        });
    }
});
function welcome(app) {
    app.ask(app.buildRichResponse()
        .addSimpleResponse({
        speech: `<speak>
                    <s> Hi, I'm you push notification assistant  </s>
                </speak>`
    }));
}
// Start opt-in flow for push notifications
function setupPush(app) {
    app.askForUpdatePermission("what_did_i_missed"); //argument is intent name of dialogflow (remove space from the name, not sure)
}
// # NOTE
// must have to enable notification 3 places, 
// - first in google action dashboard(overview>Action discovery and updates>{intent-name}>Enable User updates and notifications>set title of notification) 
// - second in google cloud console(Firebase Cloud Messaging API https://console.cloud.google.com/apis/api/fcm.googleapis.com/overview?project=home-push-notification)
// otherwise i will just keep saying '{your app name} is not responding'
// - third https://console.developers.google.com/apis/library/actions.googleapis.com/?project=home-push-notification
// Save intent and user id if user gave consent.
function finishPushSetup(app) {
    const userID = app.getArgument('UPDATES_USER_ID');
    console.log("userId for notification: ", userID, "(call notification endpoint with this id to get notify)");
    if (app.isPermissionGranted()) {
        app.tell("Ok, I'll start alerting you at " + userID);
    }
    else {
        app.tell("Ok, I won't alert you");
    }
}
exports.trigerPush = functions.https.onRequest((request, response) => {
    const jwtClient = new googleapis_1.google.auth.JWT(serviceAccount.client_email, null, serviceAccount.private_key, ['https://www.googleapis.com/auth/actions.fulfillment.conversation'], null);
    let notification = {
        userNotification: {
            title: 'AoG tips latest tip'
        },
        target: {
            userId: request.body.userid,
            intent: "what_did_i_missed" //dialogflow intent name
        }
    };
    jwtClient.authorize(function (err, tokens) {
        if (err) {
            throw new Error(`Auth error: ${err}`);
        }
        r.post('https://actions.googleapis.com/v2/conversations:send', {
            'auth': {
                'bearer': tokens.access_token
            },
            'json': true,
            'body': { 'customPushMessage': notification, 'isInSandbox': true }
        }, function (error, httpResponse, body) {
            if (error) {
                throw new Error(`API request error: ${err}`);
            }
            console.log(httpResponse.statusCode + ': ' + httpResponse.statusMessage);
            console.log(JSON.stringify(body));
            response.send("done");
        });
    });
    return 0;
});
//# sourceMappingURL=index.js.map