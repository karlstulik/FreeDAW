import { defineStore } from 'pinia'
import { ref, markRaw } from 'vue'

export const useDialogStore = defineStore('dialog', () => {
  const isOpen = ref(false)
  const title = ref('')
  const message = ref('')
  const type = ref('alert') // 'alert', 'confirm', 'prompt', 'custom'
  const inputValue = ref('')
  const resolveFn = ref(null)
  const customComponent = ref(null)
  const customProps = ref({})

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

  function showCustom(component, props = {}, dialogTitle = '') {
    title.value = dialogTitle
    type.value = 'custom'
    customComponent.value = markRaw(component)
    customProps.value = props
    isOpen.value = true
    return new Promise((resolve) => {
      resolveFn.value = resolve
    })
  }

  function close(result = null) {
    isOpen.value = false
    if (resolveFn.value) {
      resolveFn.value(result)
      resolveFn.value = null
    }
  }

  return {
    isOpen,
    title,
    message,
    type,
    inputValue,
    customComponent,
    customProps,
    showAlert,
    showConfirm,
    showPrompt,
    showCustom,
    close
  }
})