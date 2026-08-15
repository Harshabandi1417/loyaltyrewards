namespace loyaltyrewards;

entity Customers {
    key ID : Integer;
    name : String(100);
    email : String(100);
    points : Integer;
    tier : String(20);
}

entity Transactions {
    key ID : UUID;
    customer_ID : Integer;
    channel : String(20);
    amount : Decimal(15,2);
    pointsEarned : Integer;
    transactionDate : Timestamp;
}

entity Redemptions {
    key ID : UUID;
    customer_ID : Integer;
    pointsUsed : Integer;
    redemptionDate : Timestamp;
    remarks : String(255);
}
