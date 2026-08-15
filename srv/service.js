import cds from "@sap/cds";

export default cds.service.impl(function () {

    const {
        Customers,
        Transactions,
        Redemptions
    } = this.entities;

    function calculateTier(iPoints) {
        if (iPoints >= 2000) {
            return "Gold";
        }

        if (iPoints >= 1000) {
            return "Silver";
        }

        return "Bronze";
    }

    function calculatePurchasePoints(sChannel, fAmount) {
        if (sChannel === "Online") {
            return Math.floor(fAmount / 10);
        }

        if (sChannel === "Store") {
            return Math.floor(fAmount / 20);
        }

        return 0;
    }


    this.on("addPoints", async (req) => {

        const { ID, points } = req.data;

        if (!Number.isInteger(ID)) {
            return req.error(
                400,
                "Customer ID must be an integer"
            );
        }

        if (!Number.isInteger(points) || points <= 0) {
            return req.error(
                400,
                "Points must be a positive integer"
            );
        }

        const customer = await SELECT.one
            .from(Customers)
            .where({ ID });

        if (!customer) {
            return req.error(
                404,
                `Customer with ID ${ID} not found`
            );
        }

        const newPoints =
            (Number(customer.points) || 0) + points;

        const newTier = calculateTier(newPoints);

        await UPDATE(Customers)
            .set({
                points: newPoints,
                tier: newTier
            })
            .where({ ID });

        await INSERT.into(Transactions).entries({
            customer_ID: ID,
            channel: "Manual",
            amount: 0,
            pointsEarned: points,
            transactionDate: new Date().toISOString()
        });

        return newPoints;
    });


    this.on("recordPurchase", async (req) => {

        const { ID, channel, amount } = req.data;

        if (!Number.isInteger(ID)) {
            return req.error(
                400,
                "Customer ID must be an integer"
            );
        }

        if (
            channel !== "Online" &&
            channel !== "Store"
        ) {
            return req.error(
                400,
                "Channel must be Online or Store"
            );
        }

        const fAmount = Number(amount);

        if (!Number.isFinite(fAmount) || fAmount <= 0) {
            return req.error(
                400,
                "Purchase amount must be greater than zero"
            );
        }

        const customer = await SELECT.one
            .from(Customers)
            .where({ ID });

        if (!customer) {
            return req.error(
                404,
                `Customer with ID ${ID} not found`
            );
        }

        const pointsEarned =
            calculatePurchasePoints(channel, fAmount);

        if (pointsEarned <= 0) {
            return req.error(
                400,
                "Purchase amount is too small to earn points"
            );
        }

        const newPoints =
            (Number(customer.points) || 0) +
            pointsEarned;

        const newTier = calculateTier(newPoints);

        await UPDATE(Customers)
            .set({
                points: newPoints,
                tier: newTier
            })
            .where({ ID });

        await INSERT.into(Transactions).entries({
            customer_ID: ID,
            channel: channel,
            amount: fAmount,
            pointsEarned: pointsEarned,
            transactionDate: new Date().toISOString()
        });

        return pointsEarned;
    });


    this.on("redeemPoints", async (req) => {

        const {
            ID,
            points,
            remarks
        } = req.data;

        if (!Number.isInteger(ID)) {
            return req.error(
                400,
                "Customer ID must be an integer"
            );
        }

        if (!Number.isInteger(points) || points <= 0) {
            return req.error(
                400,
                "Points must be a positive integer"
            );
        }

        const sRemarks =
            typeof remarks === "string"
                ? remarks.trim()
                : "";

        if (!sRemarks) {
            return req.error(
                400,
                "Redemption remarks are required"
            );
        }

        const customer = await SELECT.one
            .from(Customers)
            .where({ ID });

        if (!customer) {
            return req.error(
                404,
                `Customer with ID ${ID} not found`
            );
        }

        const currentPoints =
            Number(customer.points) || 0;

        if (currentPoints < points) {
            return req.error(
                400,
                `Insufficient points. Customer has ${currentPoints} points`
            );
        }

        const newPoints =
            currentPoints - points;

        const newTier = calculateTier(newPoints);

        await UPDATE(Customers)
            .set({
                points: newPoints,
                tier: newTier
            })
            .where({ ID });

        await INSERT.into(Redemptions).entries({
            customer_ID: ID,
            pointsUsed: points,
            redemptionDate: new Date().toISOString(),
            remarks: sRemarks
        });

        return newPoints;
    });


    this.on("deleteCustomer", async (req) => {

        const { ID } = req.data;

        if (!Number.isInteger(ID)) {
            return req.error(
                400,
                "Customer ID must be an integer"
            );
        }

        const customer = await SELECT.one
            .from(Customers)
            .where({ ID });

        if (!customer) {
            return req.error(
                404,
                `Customer with ID ${ID} not found`
            );
        }

        await DELETE.from(Redemptions)
            .where({ customer_ID: ID });

        await DELETE.from(Transactions)
            .where({ customer_ID: ID });

        await DELETE.from(Customers)
            .where({ ID });

        return true;
    });


    this.on("createCustomer", async (req) => {

        const { name, email } = req.data;

        const sName =
            typeof name === "string"
                ? name.trim()
                : "";

        const sEmail =
            typeof email === "string"
                ? email.trim()
                : "";

        if (!sName) {
            return req.error(
                400,
                "Customer name is required"
            );
        }

        if (!sEmail) {
            return req.error(
                400,
                "Customer email is required"
            );
        }

        if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sEmail)
        ) {
            return req.error(
                400,
                "Enter a valid email address"
            );
        }

        const existingCustomer = await SELECT.one
            .from(Customers)
            .where({ email: sEmail });

        if (existingCustomer) {
            return req.error(
                400,
                `Customer with email ${sEmail} already exists`
            );
        }

        const result = await SELECT.one
            .from(Customers)
            .columns("max(ID) as maxID");

        const newID =
            (result?.maxID || 0) + 1;

        await INSERT.into(Customers).entries({
            ID: newID,
            name: sName,
            email: sEmail,
            points: 0,
            tier: "Bronze"
        });

        return newID;
    });

});
