import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { v4 as uuid } from 'uuid'

export interface OrderProduct {
  code: string
  price: number
}

export interface Order {
  pk: string
  sk?: string
  createdAt?: number
  shipping: {
    type: 'URGENT' | 'ECONOMIC'
    carrier: 'CORREIOS' | 'FEDEX'
  }
  billing: {
    payment: 'CASH' | 'DEBIT_CARD' | 'CREDIT_CARD'
    totalPrice: number
  }
  products: OrderProduct[]
}

export class OrderRepository {
  private ddbClient: DocumentClient
  private ordersDdb: string

  constructor(ddbClient: DocumentClient, orderDdb: string) {
    this.ddbClient = ddbClient
    this.ordersDdb = orderDdb
  }

  async createOrder(order: Order): Promise<Order> {
    order.sk = uuid()
    order.createdAt = Date.now()
    await this.ddbClient
      .put({
        TableName: this.ordersDdb,
        Item: order,
      })
      .promise()
    return order
  }

  async getAllOrders(): Promise<Order[]> {
    const data = await this.ddbClient
      .scan({
        TableName: this.ordersDdb,
      })
      .promise()

    return data.Items as Order[]
  }

  async getOrdersByEmail(email: string): Promise<Order[]> {
    const data = await this.ddbClient
      .query({
        TableName: this.ordersDdb,
        KeyConditionExpression: 'pk = :email',
        ExpressionAttributeValues: {
          ':email': email,
        },
      })
      .promise()
    return data.Items as Order[]
  }
}
