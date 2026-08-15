sap.ui.define(function () {
	"use strict";

	return {
		name: "QUnit test suite for the UI5 Application: com.loyaltyrewards.app",
		defaults: {
			page: "ui5://test-resources/com/loyaltyrewards/app/Test.qunit.html?testsuite={suite}&test={name}",
			qunit: {
				version: 2
			},
			sinon: {
				version: 1
			},
			ui5: {
				language: "EN",
				theme: "sap_horizon"
			},
			coverage: {
				only: "com/loyaltyrewards/app/",
				never: "test-resources/com/loyaltyrewards/app/"
			},
			loader: {
				paths: {
					"com/loyaltyrewards/app": "../"
				}
			}
		},
		tests: {
			"unit/unitTests": {
				title: "Unit tests for com.loyaltyrewards.app"
			},
			"integration/opaTests": {
				title: "Integration tests for com.loyaltyrewards.app"
			}
		}
	};
});
