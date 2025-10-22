<template>
  <v-dialog :model-value="isOpen" @update:model-value="close" max-width="500" :persistent="type === 'confirm' || type === 'prompt'">
    <v-card>
      <v-card-title>{{ title }}</v-card-title>
      <v-card-text>
        {{ message }}
        <v-text-field v-if="type === 'prompt'" v-model="inputValue" @keyup.enter="close(true)" autofocus></v-text-field>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn v-if="type !== 'alert'" @click="close(false)">Cancel</v-btn>
        <v-btn color="primary" @click="close(true)">{{ buttonText }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useDialogStore } from '@/stores/dialog'

const dialogStore = useDialogStore()
const { isOpen, title, message, type, inputValue } = storeToRefs(dialogStore)
const { close } = dialogStore

const buttonText = computed(() => {
  if (type.value === 'prompt') return 'Rename'
  return 'OK'
})
</script>