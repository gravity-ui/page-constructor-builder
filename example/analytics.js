/**
 * Analytics configuration for Page Constructor
 * This file exports analytics configuration that will be passed to PageConstructorProvider
 */

// Example analytics function that sends events to console
// In real application, replace this with your analytics service (Google Analytics, Yandex.Metrica, etc.)
function sendEvents(events) {
    console.log('📊 Analytics events:', events);

    // Example: Send to Google Analytics
    // events.forEach(event => {
    //     if (typeof gtag !== 'undefined') {
    //         gtag('event', event.name, {
    //             event_category: event.type || 'page_constructor',
    //             event_label: event.target,
    //             custom_parameter: event.context
    //         });
    //     }
    // });

    // Example: Send to Yandex.Metrica
    // events.forEach(event => {
    //     if (typeof ym !== 'undefined') {
    //         ym(COUNTER_ID, 'reachGoal', event.name, {
    //             type: event.type,
    //             target: event.target,
    //             context: event.context
    //         });
    //     }
    // });
}

// Export analytics configuration
module.exports = {
    sendEvents: sendEvents,
    autoEvents: true, // Enable automatic event tracking
};

// Alternative export formats (choose one):

// As default export:
// module.exports = {
//     sendEvents: sendEvents,
//     autoEvents: true,
// };

// As named export:
// module.exports.analytics = {
//     sendEvents: sendEvents,
//     autoEvents: true,
// };

// As function that returns config:
// module.exports = function() {
//     return {
//         sendEvents: sendEvents,
//         autoEvents: true,
//     };
// };
