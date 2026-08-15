sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/Dialog",
    "sap/m/Label",
    "sap/m/Input",
    "sap/m/Select",
    "sap/ui/core/Item",
    "sap/m/Button",
    "sap/m/MessageToast",
"sap/m/MessageBox"
], function (
    Controller,
    JSONModel,
    Dialog,
    Label,
    Input,
    Select,
    Item,
    Button,
    MessageToast,
MessageBox
) {
    "use strict";

    return Controller.extend(
        "com.loyaltyrewards.app.controller.CustomerDetails",
        {

            onInit: function () {
                this.getOwnerComponent()
                    .getRouter()
                    .getRoute("customerDetails")
                    .attachPatternMatched(
                        this._onRouteMatched,
                        this
                    );
            },

            _onRouteMatched: function (oEvent) {
                const sCustomerId =
                    oEvent.getParameter("arguments").customerId;

                this._loadCustomerDetails(sCustomerId);
            },

            _loadCustomerDetails: function (sCustomerId) {
                const oController = this;

                Promise.all([
                    fetch(
                        "/odata/v4/loyalty-rewards/Customers(" +
                        sCustomerId +
                        ")"
                    ),
                    fetch(
                        "/odata/v4/loyalty-rewards/Transactions?$filter=customer_ID%20eq%20" +
                        sCustomerId +
                        "&$orderby=transactionDate%20desc"
                    ),
                    fetch(
                        "/odata/v4/loyalty-rewards/Redemptions?$filter=customer_ID%20eq%20" +
                        sCustomerId +
                        "&$orderby=redemptionDate%20desc"
                    )
                ])
                    .then(function (aResponses) {
                        aResponses.forEach(function (oResponse) {
                            if (!oResponse.ok) {
                                throw new Error(
                                    "HTTP " + oResponse.status
                                );
                            }
                        });

                        return Promise.all(
                            aResponses.map(function (oResponse) {
                                return oResponse.json();
                            })
                        );
                    })
                    .then(function (aResults) {
                        const oCustomer = aResults[0];
                        const aTransactions =
                            aResults[1].value || [];
                        const aRedemptions =
                            aResults[2].value || [];

                        oController.getView().setModel(
                            new JSONModel(oCustomer),
                            "customer"
                        );

                        oController._setTransactionModels(
                            aTransactions
                        );

                        oController.getView().setModel(
                            new JSONModel(aRedemptions),
                            "redemptions"
                        );
                    })
                    .catch(function (oError) {
                        console.error(
                            "Failed to load customer details:",
                            oError
                        );

                        MessageToast.show(
                            "Could not load customer details"
                        );
                    });
            },

            _setTransactionModels: function (aTransactions) {
                let iEarned = 0;

                aTransactions.forEach(function (oTransaction) {
                    iEarned +=
                        Number(oTransaction.pointsEarned) || 0;
                });

                this.getView().setModel(
                    new JSONModel(aTransactions),
                    "transactions"
                );

                this.getView().setModel(
                    new JSONModel({
                        count: aTransactions.length,
                        earned: iEarned
                    }),
                    "transactionSummary"
                );
            },

            _loadTransactions: function () {
                const oCustomerModel =
                    this.getView().getModel("customer");

                if (!oCustomerModel) {
                    return;
                }

                const oCustomer =
                    oCustomerModel.getData();

                if (!oCustomer || !oCustomer.ID) {
                    return;
                }

                const oController = this;

                Promise.all([
                    fetch(
                        "/odata/v4/loyalty-rewards/Transactions?$filter=customer_ID%20eq%20" +
                        oCustomer.ID +
                        "&$orderby=transactionDate%20desc"
                    ),
                    fetch(
                        "/odata/v4/loyalty-rewards/Redemptions?$filter=customer_ID%20eq%20" +
                        oCustomer.ID +
                        "&$orderby=redemptionDate%20desc"
                    )
                ])
                    .then(function (aResponses) {
                        aResponses.forEach(function (oResponse) {
                            if (!oResponse.ok) {
                                throw new Error(
                                    "HTTP " + oResponse.status
                                );
                            }
                        });

                        return Promise.all(
                            aResponses.map(function (oResponse) {
                                return oResponse.json();
                            })
                        );
                    })
                    .then(function (aResults) {
                        oController._setTransactionModels(
                            aResults[0].value || []
                        );

                        oController.getView().setModel(
                            new JSONModel(
                                aResults[1].value || []
                            ),
                            "redemptions"
                        );
                    })
                    .catch(function (oError) {
                        console.error(
                            "Failed to refresh transactions:",
                            oError
                        );
                    });
            },

        formatTransactionPoints: function (iPoints) {
            if (iPoints === undefined || iPoints === null) {
                return "";
            }

            return "+" + (Number(iPoints) || 0);
        },

        formatTransactionDate: function (sDate) {
            if (!sDate) {
                return "";
            }

            const oDate = new Date(sDate);

            if (Number.isNaN(oDate.getTime())) {
                return sDate;
            }

            return oDate.toLocaleString();
        },

        onNavBack: function () {
                this.getOwnerComponent()
                    .getRouter()
                    .navTo("main");
            },

            onEditCustomer: function () {
            const oController = this;

            const oCustomerModel =
                this.getView().getModel("customer");

            if (!oCustomerModel) {
                MessageToast.show("Customer data not loaded");
                return;
            }

            const oCustomer = oCustomerModel.getData();

            const oNameInput = new Input({
                value: oCustomer.name || "",
                placeholder: "Enter customer name",
                width: "100%"
            });

            const oEmailInput = new Input({
                type: "Email",
                value: oCustomer.email || "",
                placeholder: "Enter email address",
                width: "100%"
            });

            const oDialog = new Dialog({
                title: "Edit Customer",
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
                    text: "Save",
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

                        const oButton =
                            oDialog.getBeginButton();

                        oButton.setEnabled(false);

                        fetch(
                            "/odata/v4/loyalty-rewards/Customers(" +
                            oCustomer.ID +
                            ")",
                            {
                                method: "PATCH",
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
                                                "Failed to update customer"
                                            );
                                        });
                                }

                                return oResponse.json();
                            })
                            .then(function (oUpdatedCustomer) {
                                oCustomerModel.setData(
                                    Object.assign(
                                        {},
                                        oCustomer,
                                        oUpdatedCustomer
                                    )
                                );

                                MessageToast.show(
                                    "Customer updated successfully"
                                );

                                oDialog.close();
                            })
                            .catch(function (oError) {
                                console.error(
                                    "Edit Customer failed:",
                                    oError
                                );

                                MessageToast.show(
                                    oError.message ||
                                    "Could not update customer"
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

        onAddPoints: function () {
            const oController = this;

            const oInput = new Input({
                type: "Number",
                placeholder: "Enter points",
                width: "100%"
            });

            const oDialog = new Dialog({
                title: "Add Loyalty Points",
                contentWidth: "25rem",
                content: [
                    new Label({
                        text: "Points",
                        labelFor: oInput
                    }),
                    oInput
                ],
                beginButton: new Button({
                    text: "Add",
                    type: "Emphasized",
                    press: function () {
                        const iPoints = Number(oInput.getValue());

                        if (
                            !Number.isInteger(iPoints) ||
                            iPoints <= 0
                        ) {
                            MessageToast.show(
                                "Enter a valid positive number"
                            );
                            return;
                        }

                        const oCustomer = oController
                            .getView()
                            .getModel("customer")
                            .getData();

                        const oButton = oDialog.getBeginButton();
                        oButton.setEnabled(false);

                        fetch("/odata/v4/loyalty-rewards/addPoints", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                ID: oCustomer.ID,
                                points: iPoints
                            })
                        })
                            .then(function (oResponse) {
                                if (!oResponse.ok) {
                                    return oResponse.json().then(function (oError) {
                                        throw new Error(
                                            oError.error?.message ||
                                            "Failed to add points"
                                        );
                                    });
                                }

                                return oResponse.json();
                            })
                            .then(function (oResult) {
                                oCustomer.points = oResult.value;

                                oController
                                    .getView()
                                    .getModel("customer")
                                    .setData(oCustomer);

                                MessageToast.show(
                                    "Points added successfully"
                                );

                                oController._loadTransactions();

                                oDialog.close();
                            })
                            .catch(function (oError) {
                                console.error(
                                    "Add Points failed:",
                                    oError
                                );

                                MessageToast.show(
                                    "Could not add points"
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
        onRecordPurchase: function () {
            const oController = this;

            const oChannelSelect = new Select({
                width: "100%",
                selectedKey: "Online",
                items: [
                    new Item({
                        key: "Online",
                        text: "Online"
                    }),
                    new Item({
                        key: "Store",
                        text: "Store"
                    })
                ]
            });

            const oAmountInput = new Input({
                type: "Number",
                placeholder: "Enter purchase amount",
                width: "100%"
            });

            const oDialog = new Dialog({
                title: "Record Purchase",
                contentWidth: "25rem",

                content: [
                    new Label({
                        text: "Channel",
                        labelFor: oChannelSelect
                    }),

                    oChannelSelect,

                    new Label({
                        text: "Amount",
                        labelFor: oAmountInput
                    }).addStyleClass("sapUiSmallMarginTop"),

                    oAmountInput
                ],

                beginButton: new Button({
                    text: "Submit Purchase",
                    type: "Emphasized",

                    press: function () {
                        const sChannel =
                            oChannelSelect.getSelectedKey();

                        const nAmount =
                            Number(oAmountInput.getValue());

                        if (!sChannel) {
                            MessageToast.show(
                                "Select a purchase channel"
                            );
                            return;
                        }

                        if (
                            !Number.isFinite(nAmount) ||
                            nAmount <= 0
                        ) {
                            MessageToast.show(
                                "Enter a valid positive amount"
                            );
                            return;
                        }

                        const oCustomer =
                            oController
                                .getView()
                                .getModel("customer")
                                .getData();

                        if (!oCustomer || !oCustomer.ID) {
                            MessageToast.show(
                                "Customer data not loaded"
                            );
                            return;
                        }

                        const oButton =
                            oDialog.getBeginButton();

                        oButton.setEnabled(false);

                        fetch(
                            "/odata/v4/loyalty-rewards/recordPurchase",
                            {
                                method: "POST",
                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },
                                body: JSON.stringify({
                                    ID: oCustomer.ID,
                                    channel: sChannel,
                                    amount: nAmount
                                })
                            }
                        )
                            .then(function (oResponse) {
                                if (!oResponse.ok) {
                                    return oResponse.json()
                                        .catch(function () {
                                            return {};
                                        })
                                        .then(function (oError) {
                                            throw new Error(
                                                oError.error?.message ||
                                                "Failed to record purchase"
                                            );
                                        });
                                }

                                return oResponse.json();
                            })
                            .then(function (oResult) {
                                const iPoints =
                                    Number(oResult.value) || 0;

                                MessageToast.show(
                                    "Purchase recorded. " +
                                    iPoints +
                                    " points earned"
                                );

                                oDialog.close();

                                return fetch(
                                    "/odata/v4/loyalty-rewards/Customers(" +
                                    oCustomer.ID +
                                    ")"
                                );
                            })
                            .then(function (oResponse) {
                                if (!oResponse.ok) {
                                    throw new Error(
                                        "Failed to refresh customer"
                                    );
                                }

                                return oResponse.json();
                            })
                            .then(function (oUpdatedCustomer) {
                                oController
                                    .getView()
                                    .getModel("customer")
                                    .setData(oUpdatedCustomer);

                                oController._loadTransactions();
                            })
                            .catch(function (oError) {
                                console.error(
                                    "Record Purchase failed:",
                                    oError
                                );

                                MessageToast.show(
                                    oError.message ||
                                    "Could not record purchase"
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

        onDeleteCustomer: function () {
            const oController = this;

            const oCustomerModel =
                this.getView().getModel("customer");

            if (!oCustomerModel) {
                MessageToast.show("Customer data not loaded");
                return;
            }

            const oCustomer = oCustomerModel.getData();

            if (!oCustomer || !oCustomer.ID) {
                MessageToast.show("Customer ID not found");
                return;
            }

            MessageBox.confirm(
                "Delete " +
                (oCustomer.name || "this customer") +
                "? This will also delete the customer's transaction history.",
                {
                    title: "Delete Customer",
                    actions: [
                        MessageBox.Action.DELETE,
                        MessageBox.Action.CANCEL
                    ],
                    emphasizedAction: MessageBox.Action.DELETE,
                    onClose: function (sAction) {
                        if (sAction !== MessageBox.Action.DELETE) {
                            return;
                        }

                        fetch(
                            "/odata/v4/loyalty-rewards/deleteCustomer",
                            {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({
                                    ID: oCustomer.ID
                                })
                            }
                        )
                            .then(function (response) {
                                if (!response.ok) {
                                    return response.json()
                                        .catch(function () {
                                            return {};
                                        })
                                        .then(function (oError) {
                                            throw new Error(
                                                oError.error?.message ||
                                                "HTTP " + response.status
                                            );
                                        });
                                }

                                return response.json();
                            })
                            .then(function () {
                                MessageToast.show(
                                    "Customer deleted successfully"
                                );

                                oController
                                    .getOwnerComponent()
                                    .getRouter()
                                    .navTo("main");
                            })
                            .catch(function (oError) {
                                console.error(
                                    "Delete Customer failed:",
                                    oError
                                );

                                MessageToast.show(
                                    oError.message ||
                                    "Could not delete customer"
                                );
                            });
                    }
                }
            );
        },

        onRedeemPoints: function () {
            const oController = this;

            const oPointsInput = new Input({
                type: "Number",
                placeholder: "Enter points",
                width: "100%"
            });

            const oRemarksInput = new Input({
                placeholder: "Enter redemption remarks",
                width: "100%"
            });

            const oDialog = new Dialog({
                title: "Redeem Loyalty Points",
                contentWidth: "25rem",

                content: [
                    new Label({
                        text: "Points",
                        labelFor: oPointsInput
                    }),

                    oPointsInput,

                    new Label({
                        text: "Remarks",
                        labelFor: oRemarksInput
                    }).addStyleClass("sapUiSmallMarginTop"),

                    oRemarksInput
                ],

                beginButton: new Button({
                    text: "Redeem",
                    type: "Emphasized",

                    press: function () {
                        const iPoints =
                            Number(oPointsInput.getValue());

                        const sRemarks =
                            oRemarksInput.getValue().trim();

                        if (
                            !Number.isInteger(iPoints) ||
                            iPoints <= 0
                        ) {
                            MessageToast.show(
                                "Enter a valid positive number"
                            );
                            return;
                        }

                        if (!sRemarks) {
                            MessageToast.show(
                                "Enter redemption remarks"
                            );
                            return;
                        }

                        const oCustomer =
                            oController
                                .getView()
                                .getModel("customer")
                                .getData();

                        if (!oCustomer || !oCustomer.ID) {
                            MessageToast.show(
                                "Customer data not loaded"
                            );
                            return;
                        }

                        const oButton =
                            oDialog.getBeginButton();

                        oButton.setEnabled(false);

                        fetch(
                            "/odata/v4/loyalty-rewards/redeemPoints",
                            {
                                method: "POST",
                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },
                                body: JSON.stringify({
                                    ID: oCustomer.ID,
                                    points: iPoints,
                                    remarks: sRemarks
                                })
                            }
                        )
                            .then(function (oResponse) {
                                if (!oResponse.ok) {
                                    return oResponse.json()
                                        .catch(function () {
                                            return {};
                                        })
                                        .then(function (oError) {
                                            throw new Error(
                                                oError.error?.message ||
                                                "Failed to redeem points"
                                            );
                                        });
                                }

                                return oResponse.json();
                            })
                            .then(function (oResult) {
                                MessageToast.show(
                                    "Points redeemed successfully"
                                );

                                oDialog.close();

                                return fetch(
                                    "/odata/v4/loyalty-rewards/Customers(" +
                                    oCustomer.ID +
                                    ")"
                                );
                            })
                            .then(function (oResponse) {
                                if (!oResponse.ok) {
                                    throw new Error(
                                        "Failed to refresh customer"
                                    );
                                }

                                return oResponse.json();
                            })
                            .then(function (oUpdatedCustomer) {
                                oController
                                    .getView()
                                    .getModel("customer")
                                    .setData(oUpdatedCustomer);

                                oController._loadTransactions();
                            })
                            .catch(function (oError) {
                                console.error(
                                    "Redeem Points failed:",
                                    oError
                                );

                                MessageToast.show(
                                    oError.message ||
                                    "Could not redeem points"
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
        }
        }

    );
});
