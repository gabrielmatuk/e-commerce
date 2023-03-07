# Ecommerce API

The ECommerce API is a descentralized API to create a full Ecommerce Backend structure using CDK.

### API Structure

| HTTP METHOD           | POST     | GET         | PUT         | DELETE      |
| --------------------- | -------- | ----------- | ----------- | ----------- |
| CRUD Products         | CREATE   | READ        | UPDATE      | DELETE      |
| CRUD Orders           | CREATE   | READ        | UPDATE      | DELETE      |
| /products             | Ok (201) | Error (404) | Error (404) | Error (404) |
| /products/:id         | Ok (201) | Error (404) | Error (404) | Error (404) |
| /orders               | Ok (201) | Error (404) | Error (404) | Error (404) |
| /orders?email         | Ok (201) | Error (404) | Error (404) | Error (404) |
| /orders?email&orderId | Ok (201) | Error (404) | Error (404) | Error (404) |

## Infrastructure Architeture

![infrastructure](tools/ecommerce-diagram.svg?raw=true)

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `npm run deploy` deploy this stack to your default AWS account/region
- `npm run diff` compare deployed stack with current state
- `npm run clean` destroy all stacks on AWS account/region
