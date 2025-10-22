import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDialogStore = defineStore('dialog', () => {
  const isOpen = ref(false)
  const title = ref('')
  const message = ref('')
  const type = ref('alert') // 'alert', 'confirm', 'prompt'
  const inputValue = ref('')
  const resolveFn = ref(null)

  function showAlert(dialogMessage, dialogTitle = 'Alert') {
    title.value = dialogTitle
    message.value = dialogMessage
    type.value = 'alert'
    isOpen.value = true
    return new Promise((resolve) => {
      resolveFn.value = resolve
    })
  }

  function showConfirm(dialogMessage, dialogTitle = 'Confirm') {
    title.value = dialogTitle
    message.value = dialogMessage
    type.value = 'confirm'
    isOpen.value = true
    return new Promise((resolve) => {
      resolveFn.value = resolve
    })
  }

  function showPrompt(dialogMessage, dialogTitle = 'Prompt', defaultValue = '') {
    title.value = dialogTitle
    message.value = dialogMessage
    type.value = 'prompt'
    inputValue.value = defaultValue
    isOpen.value = true
    return new Promise((resolve) => {
      resolveFn.value = resolve
    })
  }

  function close(result = false) {
    isOpen.value = false
    if (resolveFn.value) {
      if (type.value === 'prompt') {
        resolveFn.value(result ? inputValue.value : null)
      } else {
        resolveFn.value(result)
      }
      resolveFn.value = null
    }
  }

  return {
    isOpen,
    title,
    message,
    type,
    inputValue,
    showAlert,
    showConfirm,
    showPrompt,
    close
  }
})