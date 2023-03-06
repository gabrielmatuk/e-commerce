import { Callback, Context, PostConfirmationTriggerEvent } from 'aws-lambda'

export const handler = async (
  event: PostConfirmationTriggerEvent,
  context: Context,
  callback: Callback
): Promise<void> => {
  console.log(event)

  callback(null, event)
}
