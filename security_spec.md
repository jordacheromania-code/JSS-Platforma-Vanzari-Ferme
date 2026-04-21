# Firestore Security Specification - JSS Farm Platform

## Data Invariants
1. **Users**: Every user must have a role (`admin` or `farmer`). Admins are restricted by email.
2. **Products**: Must belong to a farmer (`farmerId`). Price and quantity cannot be negative.
3. **Partner Stores**: Can be created by admins or farmers (if tracking their own). Contain legal and contact info.
4. **Orders**: Must link a farmer, a store, and have a unique order number. Quantities and prices must be valid.
5. **Potential Partners**: Publicly visible list of target stores. Only admins can modify.

## The "Dirty Dozen" Payloads
These payloads represent malicious or invalid data that MUST be rejected:
1. **Privilege Escalation**: Farmer trying to set `role: 'admin'` in `/users`.
2. **Identity Spoofing**: User A creating a product with `farmerId: UserB`.
3. **Ghost Field**: Adding `isVerified: true` to a product entry without schema permission.
4. **Invalid Type**: Setting `pricePerKg: "high"` (string instead of number).
5. **Negative Resource**: Creating a product with `quantity: -100`.
6. **Orphaned Order**: Creating an order for a non-existent `storeId`.
7. **Bypassing Immutability**: Updating `farmerId` on an existing order.
8. **Unauthorized Admin Write**: Non-admin user trying to delete a store from `potentialPartners`.
9. **Identity Poisoning**: Using a 2KB string as a `productId`.
10. **State Shortcutting**: Marking an order as `paid: true` when not the owner or admin.
11. **Shadow User**: Creating a user profile for a different UID.
12. **PII Leak**: Non-admin/non-owner trying to 'get' a user's phone number if it were stored in a private doc.

## Match Blocks Coverage
- `/users/{userId}`: Owner or Admin.
- `/products/{productId}`: Owner or Admin.
- `/partnerStores/{storeId}`: Signed in (read), Admin or Farmer (write).
- `/orders/{orderId}`: Owner or Admin.
- `/potentialPartners/{partnerId}`: Signed in (read), Admin (write).
