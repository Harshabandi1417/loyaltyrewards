sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/Dialog",
    "sap/m/Label",
    "sap/m/Input",
    "sap/m/Button",
    "sap/m/MessageToast"
], function (
    Controller,
    JSONModel,
    Filter,
    FilterOperator,
    Dialog,
    Label,
    Input,
    Button,
    MessageToast
) {
    "use strict";

    return Controller.extend("com.loyaltyrewards.app.controller.Main", {

        onInit: function () {
            const oModel = new JSONModel();

            this.getView().setModel(oModel);

            this._loadCustomers();

            this.getOwnerComponent()
                .getRouter()
                .getRoute("main")
                .attachPatternMatched(
                    this._onMainRouteMatched,
                    this
                );
        },

        _onMainRouteMatched: function () {
            this._loadCustomers();
        },

        _loadCustomers: function () {
            const oModel = this.getView().getModel();

            fetch("/odata/v4/loyalty-rewards/Customers")
                .then(function (response) {
                    if (!response.ok) {
                        throw new Error("HTTP " + response.status);
                    }

                    return response.json();
                })
                .then(function (data) {
                    const aCustomers = data.value || [];

                    let iTotalPoints = 0;
                    let oTopCustomer = null;

                    aCustomers.forEach(function (oCustomer) {
                        const iPoints =
                            Number(oCustomer.points) || 0;

                        iTotalPoints += iPoints;

                        if (
                            !oTopCustomer ||
                            iPoints > Number(oTopCustomer.points)
                        ) {
                            oTopCustomer = oCustomer;
                        }
                    });

                    oModel.setData({
                        Customers: aCustomers,
                        Dashboard: {
                            totalCustomers: aCustomers.length,
                            totalPoints: iTotalPoints,
                            topCustomer: oTopCustomer
                                ? oTopCustomer.name
                                : "No customers",
                            topPoints: oTopCustomer
                                ? oTopCustomer.points
                                : 0
                        }
                    });
                })
                .catch(function (error) {
                    console.error(
                        "Failed to load customers:",
                        error
                    );

                    MessageToast.show(
                        "Could not load customers"
                    );
                });
        },

        onAddCustomer: function () {
            const oController = this;

            const oNameInput = new Input({
                placeholder: "Enter customer name",
                width: "100%"
            });

            const oEmailInput = new Input({
                type: "Email",
                placeholder: "Enter email address",
                width: "100%"
            });

            const oDialog = new Dialog({
                title: "Add Customer",
                contentWidth: "25rem",

                content: [
                    new Label({
                        text: "Name",
                        labelFor: oNameInput
                    }),

                    oNameInput,

                    new Label({
                        text: "Email",
                        labelFor: oEmailInput
                    }).addStyleClass("sapUiSmallMarginTop"),

                    oEmailInput
                ],

                beginButton: new Button({
                    text: "Add Customer",
                    type: "Emphasized",

                    press: function () {
                        const sName =
                            oNameInput.getValue().trim();

                        const sEmail =
                            oEmailInput.getValue().trim();

                        if (!sName) {
                            MessageToast.show(
                                "Enter customer name"
                            );
                            return;
                        }

                        if (!sEmail) {
                            MessageToast.show(
                                "Enter customer email"
                            );
                            return;
                        }

                        const oEmailPattern =
                            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

                        if (!oEmailPattern.test(sEmail)) {
                            MessageToast.show(
                                "Enter a valid email address"
                            );
                            return;
                        }

                        const oButton = oDialog
                            .getBeginButton();

                        oButton.setEnabled(false);

                        fetch(
                            "/odata/v4/loyalty-rewards/createCustomer",
                            {
                                method: "POST",
                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },
                                body: JSON.stringify({
                                    name: sName,
                                    email: sEmail
                                })
                            }
                        )
                            .then(function (oResponse) {
                                if (!oResponse.ok) {
                                    return oResponse.json()
                                        .then(function (oError) {
                                            throw new Error(
                                                oError.error?.message ||
                                                "Failed to create customer"
                                            );
                                        });
                                }

                                return oResponse.json();
                            })
                            .then(function () {
                                MessageToast.show(
                                    "Customer created successfully"
                                );

                                oController._loadCustomers();

                                oDialog.close();
                            })
                            .catch(function (oError) {
                                console.error(
                                    "Create Customer failed:",
                                    oError
                                );

                                MessageToast.show(
                                    oError.message ||
                                    "Could not create customer"
                                );

                                oButton.setEnabled(true);
                            });
                    }
                }),

                endButton: new Button({
                    text: "Cancel",

                    press: function () {
                        oDialog.close();
                    }
                }),

                afterClose: function () {
                    oDialog.destroy();
                }
            });

            oDialog.open();
        },

        onCustomerPress: function (oEvent) {
            const oItem = oEvent.getSource();
            const oContext = oItem.getBindingContext();

            if (!oContext) {
                sap.m.MessageToast.show(
                    "Customer binding not found"
                );
                return;
            }

            const oCustomer = oContext.getObject();

            if (!oCustomer || !oCustomer.ID) {
                sap.m.MessageToast.show(
                    "Customer ID not found"
                );
                return;
            }

            this.getOwnerComponent()
                .getRouter()
                .navTo("customerDetails", {
                    customerId: String(oCustomer.ID)
                });
        },

        onSearch: function (oEvent) {
            const sQuery =
                oEvent.getParameter("newValue");

            const oTable =
                this.byId("customersTable");

            const oBinding =
                oTable.getBinding("items");

            if (!sQuery) {
                oBinding.filter([]);
                return;
            }

            const aFilters = [
                new Filter(
                    "name",
                    FilterOperator.Contains,
                    sQuery
                ),
                new Filter(
                    "email",
                    FilterOperator.Contains,
                    sQuery
                )
            ];

            oBinding.filter(
                new Filter({
                    filters: aFilters,
                    and: false
                })
            );
        }

    });
});
