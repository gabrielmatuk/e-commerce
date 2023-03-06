import { ApiGatewayManagementApi } from 'aws-sdk'

export class InvoiceWSService {
  private apigwManagementApi: ApiGatewayManagementApi

  constructor(apigwManagementApi: ApiGatewayManagementApi) {
    this.apigwManagementApi = apigwManagementApi
  }

  sendInvoiceStatus(
    transactionId: string,
    connectionId: string,
    status: string
  ) {
    const postData = JSON.stringify({
      transactionId: transactionId,
      status: status,
    })
    return this.sendData(connectionId, postData)
  }

  async disconnectClient(connectionId: string): Promise<boolean> {
    try {
      await this.apigwManagementApi
        .getConnection({
          ConnectionId: connectionId,
        })
        .promise()

      this.apigwManagementApi
        .deleteConnection({
          ConnectionId: connectionId,
        })
        .promise()

      return true
    } catch (err) {
      console.error(err)
      return false
    }
  }

  async sendData(connectionId: string, data: string): Promise<boolean> {
    try {
      await this.apigwManagementApi
        .getConnection({
          ConnectionId: connectionId,
        })
        .promise()

      await this.apigwManagementApi
        .postToConnection({
          ConnectionId: connectionId,
          Data: data,
        })
        .promise()

      return true
    } catch (err) {
      console.error(err)
      return false
    }
  }
}
