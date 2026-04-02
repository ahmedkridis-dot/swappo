/**
 * chat-wizard.js — Swappo Swap Negotiation Wizard
 * Guides users through exchange setup after a swap is accepted:
 * Step 1: Method (meetup vs shipping)
 * Step 2: Details (location or shipping option)
 * Step 3: Confirmation
 * Users can skip to free chat at any time.
 */

var ChatWizard = (function() {
  'use strict';

  var STEPS = ['method', 'details', 'confirmation'];
  var MEETUP_PLACES = [
    { icon: '\uD83C\uDFEC', label: 'Dubai Mall', area: 'Downtown Dubai' },
    { icon: '\uD83C\uDFEC', label: 'Mall of the Emirates', area: 'Al Barsha' },
    { icon: '\uD83D\uDE87', label: 'Union Metro Station', area: 'Deira' },
    { icon: '\uD83C\uDFEC', label: 'Abu Dhabi Mall', area: 'Abu Dhabi' },
    { icon: '\uD83C\uDFEC', label: 'City Centre Sharjah', area: 'Sharjah' }
  ];

  var SHIPPING_PRICES = {
    light: { weight: '< 1 kg', price: 15 },
    medium: { weight: '1-5 kg', price: 25 },
    heavy: { weight: '5-15 kg', price: 40 },
    extra: { weight: '15+ kg', price: 60 }
  };

  /** Render the wizard step 1 (method) as HTML */
  function renderMethodStep(otherName) {
    return '<div class="wizard-step" data-step="method">' +
      '<div style="font-size:14px;font-weight:600;color:var(--teal,#09B1BA);margin-bottom:4px;">Step 1 of 3</div>' +
      '<div style="height:4px;background:#E5E7EB;border-radius:2px;margin-bottom:16px;">' +
        '<div style="width:33%;height:100%;background:var(--teal,#09B1BA);border-radius:2px;"></div>' +
      '</div>' +
      '<h3 style="font-size:16px;font-weight:600;color:#1A1A2E;margin:0 0 16px;">How would you like to exchange?</h3>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
        '<button onclick="ChatWizard.selectMethod(\'meetup\')" style="background:white;border:2px solid #E5E7EB;border-radius:12px;padding:20px;text-align:center;cursor:pointer;transition:all 0.3s;" onmouseover="this.style.borderColor=\'#09B1BA\'" onmouseout="this.style.borderColor=\'#E5E7EB\'">' +
          '<div style="font-size:28px;margin-bottom:8px;">\uD83E\uDD1D</div>' +
          '<div style="font-weight:600;color:#1A1A2E;">Meet in person</div>' +
          '<div style="font-size:12px;color:#6B7280;margin-top:4px;">Meet at a public place</div>' +
        '</button>' +
        '<button onclick="ChatWizard.selectMethod(\'shipping\')" style="background:white;border:2px solid #E5E7EB;border-radius:12px;padding:20px;text-align:center;cursor:pointer;transition:all 0.3s;" onmouseover="this.style.borderColor=\'#09B1BA\'" onmouseout="this.style.borderColor=\'#E5E7EB\'">' +
          '<div style="font-size:28px;margin-bottom:8px;">\uD83D\uDCE6</div>' +
          '<div style="font-weight:600;color:#1A1A2E;">Ship it</div>' +
          '<div style="font-size:12px;color:#6B7280;margin-top:4px;">Use a delivery service</div>' +
        '</button>' +
      '</div>' +
      '<div style="margin-top:12px;font-size:12px;color:#9CA3AF;">Both of you need to agree \u2713</div>' +
      '<button onclick="ChatWizard.skipToChat()" style="margin-top:12px;background:none;border:1px solid #E5E7EB;border-radius:999px;padding:6px 16px;font-size:12px;color:#6B7280;cursor:pointer;">\uD83D\uDCAC Switch to free chat</button>' +
    '</div>';
  }

  /** Render step 2a: meetup location */
  function renderMeetupStep() {
    var html = '<div class="wizard-step" data-step="details">' +
      '<div style="font-size:14px;font-weight:600;color:var(--teal,#09B1BA);margin-bottom:4px;">Step 2 of 3</div>' +
      '<div style="height:4px;background:#E5E7EB;border-radius:2px;margin-bottom:16px;">' +
        '<div style="width:66%;height:100%;background:var(--teal,#09B1BA);border-radius:2px;"></div>' +
      '</div>' +
      '<h3 style="font-size:16px;font-weight:600;color:#1A1A2E;margin:0 0 16px;">Where would you like to meet?</h3>' +
      '<div style="display:flex;flex-direction:column;gap:8px;">';

    MEETUP_PLACES.forEach(function(place) {
      html += '<button onclick="ChatWizard.selectPlace(\'' + place.label + '\')" style="background:white;border:1px solid #E5E7EB;border-radius:10px;padding:12px 16px;text-align:left;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:10px;" onmouseover="this.style.borderColor=\'#09B1BA\'" onmouseout="this.style.borderColor=\'#E5E7EB\'">' +
        '<span style="font-size:20px;">' + place.icon + '</span>' +
        '<div><div style="font-weight:600;font-size:14px;color:#1A1A2E;">' + place.label + '</div>' +
        '<div style="font-size:12px;color:#9CA3AF;">' + place.area + '</div></div>' +
      '</button>';
    });

    html += '</div>' +
      '<button onclick="ChatWizard.skipToChat()" style="margin-top:12px;background:none;border:1px solid #E5E7EB;border-radius:999px;padding:6px 16px;font-size:12px;color:#6B7280;cursor:pointer;">\uD83D\uDCAC Switch to free chat</button>' +
    '</div>';
    return html;
  }

  /** Render step 2b: shipping */
  function renderShippingStep() {
    return '<div class="wizard-step" data-step="details">' +
      '<div style="font-size:14px;font-weight:600;color:var(--teal,#09B1BA);margin-bottom:4px;">Step 2 of 3</div>' +
      '<div style="height:4px;background:#E5E7EB;border-radius:2px;margin-bottom:16px;">' +
        '<div style="width:66%;height:100%;background:var(--teal,#09B1BA);border-radius:2px;"></div>' +
      '</div>' +
      '<h3 style="font-size:16px;font-weight:600;color:#1A1A2E;margin:0 0 16px;">Shipping options</h3>' +
      '<div onclick="ChatWizard.selectShipping(\'swappo_express\')" style="background:#f0fdfd;border:2px solid var(--teal,#09B1BA);border-radius:12px;padding:20px;cursor:pointer;margin-bottom:12px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
          '<span style="font-weight:700;color:#1A1A2E;">\uD83D\uDCE6 Swappo Express</span>' +
          '<span style="background:var(--teal,#09B1BA);color:white;font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;">Recommended</span>' +
        '</div>' +
        '<div style="font-size:14px;color:#1A1A2E;font-weight:600;">25 AED total \u2014 12.50 AED each</div>' +
        '<div style="font-size:12px;color:#6B7280;margin-top:4px;">\uD83D\uDD50 2-3 business days \u2022 \uD83D\uDCCB Insured</div>' +
      '</div>' +
      '<button onclick="ChatWizard.skipToChat()" style="background:none;border:1px solid #E5E7EB;border-radius:999px;padding:8px 20px;font-size:13px;color:#6B7280;cursor:pointer;width:100%;">\uD83D\uDCEE Arrange my own shipping</button>' +
    '</div>';
  }

  /** Render step 3: confirmation */
  function renderConfirmation(swapData) {
    var method = swapData.method === 'meetup' ? '\uD83E\uDD1D Meet in person' : '\uD83D\uDCE6 Shipping';
    var place = swapData.place || 'Swappo Express';
    var cash = swapData.cashAmount || 0;

    return '<div class="wizard-step" data-step="confirmation">' +
      '<div style="font-size:14px;font-weight:600;color:var(--teal,#09B1BA);margin-bottom:4px;">Step 3 of 3</div>' +
      '<div style="height:4px;background:#E5E7EB;border-radius:2px;margin-bottom:16px;">' +
        '<div style="width:100%;height:100%;background:var(--teal,#09B1BA);border-radius:2px;"></div>' +
      '</div>' +
      '<h3 style="font-size:16px;font-weight:600;color:#1A1A2E;margin:0 0 16px;">\uD83D\uDCCB Swap Summary</h3>' +
      '<div style="background:#F8F9FA;border-radius:12px;padding:16px;font-size:14px;line-height:2;">' +
        '<div><strong>You give:</strong> ' + (swapData.yourItem || 'Your item') + '</div>' +
        '<div><strong>You get:</strong> ' + (swapData.theirItem || 'Their item') + '</div>' +
        (cash > 0 ? '<div><strong>Cash:</strong> <span style="color:#10B981;font-weight:600;">+ ' + cash + ' AED</span></div>' : '') +
        '<div><strong>Method:</strong> ' + method + '</div>' +
        '<div><strong>Place:</strong> ' + place + '</div>' +
      '</div>' +
      '<div style="display:flex;gap:10px;margin-top:16px;">' +
        '<button onclick="ChatWizard.confirm()" style="flex:1;background:var(--teal,#09B1BA);color:white;border:none;border-radius:999px;padding:12px;font-weight:600;font-size:14px;cursor:pointer;">\u2705 Confirm swap</button>' +
        '<button onclick="ChatWizard.skipToChat()" style="flex:1;background:#F3F4F6;color:#6B7280;border:none;border-radius:999px;padding:12px;font-weight:600;font-size:14px;cursor:pointer;">\u274C Cancel</button>' +
      '</div>' +
      '<div style="margin-top:8px;font-size:12px;color:#9CA3AF;text-align:center;">Both of you need to confirm \u2713</div>' +
    '</div>';
  }

  // State
  var wizardState = {
    active: false,
    currentStep: 0,
    method: null,
    place: null,
    swapData: {}
  };

  return {
    renderMethodStep: renderMethodStep,
    renderMeetupStep: renderMeetupStep,
    renderShippingStep: renderShippingStep,
    renderConfirmation: renderConfirmation,
    state: wizardState,

    selectMethod: function(method) {
      wizardState.method = method;
      wizardState.currentStep = 1;
      var container = document.querySelector('.wizard-step[data-step="method"]');
      if (container) {
        container.outerHTML = method === 'meetup' ? renderMeetupStep() : renderShippingStep();
      }
      if (typeof DemoNotifications !== 'undefined') {
        DemoNotifications.showToast('You chose: ' + (method === 'meetup' ? 'Meet in person' : 'Shipping'), 'success');
      }
    },

    selectPlace: function(place) {
      wizardState.place = place;
      wizardState.currentStep = 2;
      var container = document.querySelector('.wizard-step[data-step="details"]');
      if (container) {
        wizardState.swapData.method = wizardState.method;
        wizardState.swapData.place = place;
        container.outerHTML = renderConfirmation(wizardState.swapData);
      }
    },

    selectShipping: function(option) {
      wizardState.place = 'Swappo Express';
      wizardState.currentStep = 2;
      var container = document.querySelector('.wizard-step[data-step="details"]');
      if (container) {
        wizardState.swapData.method = 'shipping';
        wizardState.swapData.place = 'Swappo Express (25 AED split)';
        container.outerHTML = renderConfirmation(wizardState.swapData);
      }
    },

    confirm: function() {
      wizardState.active = false;
      var container = document.querySelector('.wizard-step[data-step="confirmation"]');
      if (container) {
        container.outerHTML = '<div style="text-align:center;padding:24px;">' +
          '<div style="font-size:48px;margin-bottom:12px;">\uD83C\uDF89</div>' +
          '<h3 style="font-size:20px;font-weight:700;color:#1A1A2E;margin:0 0 8px;">Swap Confirmed!</h3>' +
          '<p style="font-size:14px;color:#6B7280;">You can now chat freely to coordinate.</p>' +
        '</div>';
      }
      if (typeof DemoNotifications !== 'undefined') {
        DemoNotifications.showToast('Swap confirmed! \uD83C\uDF89', 'success');
      }
    },

    skipToChat: function() {
      wizardState.active = false;
      var steps = document.querySelectorAll('.wizard-step');
      steps.forEach(function(s) { s.remove(); });
      if (typeof DemoNotifications !== 'undefined') {
        DemoNotifications.showToast('Switched to free chat', 'info');
      }
    },

    /** Start the wizard for a swap */
    start: function(swapData) {
      wizardState.active = true;
      wizardState.currentStep = 0;
      wizardState.method = null;
      wizardState.place = null;
      wizardState.swapData = swapData || {};
      return renderMethodStep(swapData.otherName || 'the other person');
    }
  };
})();

window.ChatWizard = ChatWizard;
