using { loyaltyrewards as db } from '../db/schema';

service LoyaltyRewardsService {

    entity Customers as projection on db.Customers;
    entity Transactions as projection on db.Transactions;
    entity Redemptions as projection on db.Redemptions;

    action addPoints(
        ID: Integer,
        points: Integer
    ) returns Integer;

    action redeemPoints(
        ID: Integer,
        points: Integer,
        remarks: String
    ) returns Integer;

    action createCustomer(
        name: String,
        email: String
    ) returns Integer;

    action deleteCustomer(
        ID: Integer
    ) returns Boolean;

    action recordPurchase(
        ID: Integer,
        channel: String,
        amount: Decimal
    ) returns Integer;
}
