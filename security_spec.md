# Security Specification for JSS-Platforma

## Data Invariants
1. Only `jordache.romania@gmail.com` can have the `admin` role.
2. A product must have a valid `farmerId` matching the creator's UID.
3. Users cannot change their own roles once set, except via admin intervention.
4. Partner stores and potential partners can only be managed by the admin.

## The Dirty Dozen (Test Payloads)
1. User with email `evil@gmail.com` trying to set `role: 'admin'`. (REJECT)
2. Farmer trying to update another farmer's product `quantity`. (REJECT)
3. Anonymous user trying to read the list of `partnerStores`. (REJECT)
4. Admin trying to create a product with missing `pricePerKg`. (REJECT)
5. Farmer trying to delete someone else's product. (REJECT)
6. User trying to create a `potentialPartner` without `website`. (REJECT)
7. Farmer trying to update `paymentReceived` status on their own product (should only be admin or specifically permitted state change).
8. User trying to read `users` collection without being admin. (REJECT - only self read allowed)
9. User trying to inject a 1MB string into `farmName`. (REJECT)
10. Creating a product with a `createdAt` date in the future. (REJECT)
11. Updating a product's immutable `farmerId`. (REJECT)
12. Listing all products without being an admin or filtering by owner. (REJECT)

## Audit Log
- Initial draft of security rules following ABAC.
- Validation helpers for all entities.
