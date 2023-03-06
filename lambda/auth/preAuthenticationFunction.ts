import { Callback, Context, PreAuthenticationTriggerEvent } from 'aws-lambda'

export const handler = async (
  event: PreAuthenticationTriggerEvent,
  context: Context,
  callback: Callback
): Promise<void> => {
  console.log(event)

  callback(null, event)
}
