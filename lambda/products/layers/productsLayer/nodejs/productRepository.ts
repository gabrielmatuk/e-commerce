import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { v4 as uuid } from 'uuid'

export interface Product {
  id: string
  productName: string
  code: string
  price: number
  model: string
}

export class ProductRepository {
  private ddbClient: DocumentClient
  private productsDdb: string

  constructor(ddbClient: DocumentClient, productsDbd: string) {
    this.ddbClient = ddbClient
    this.productsDdb = productsDbd
  }

  //scan: nao possui uma das melhores opcoes pelo retorno demasiado de informacoes

  async getAllProducts(): Promise<Product[]> {
    const data = await this.ddbClient
      .scan({
        TableName: this.productsDdb,
      })
      .promise()
    return data.Items as Product[]
  }
}
