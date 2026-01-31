<template>
  <modal
    name="editor-settings-modal"
    class="vue-dialog beekeeper-modal editor-settings-modal"
  >
    <form @submit.prevent="submit">
      <div class="dialog-content">
        <div class="dialog-c-title">
          Editor Settings
        </div>
        <div class="form-group">
          <label for="font-size">Font Size (px)</label>
          <input
            id="font-size"
            name="font-size"
            v-model.number="fontSize"
            type="number"
            min="8"
            max="32"
            step="1"
            ref="fontSizeInput"
            placeholder="14"
          >
          <small class="form-text">Enter a value between 8 and 32 pixels. Default is 14.</small>
        </div>
      </div>
      <div class="vue-dialog-buttons flex-between">
        <span class="left" />
        <span class="right">
          <button class="btn btn-flat" type="button" @click.prevent="close">
            Cancel
          </button>
          <button class="btn btn-primary" type="submit">
            Save
          </button>
        </span>
      </div>
    </form>
  </modal>
</template>

<script lang="ts">
import Vue from "vue";
import { mapGetters } from "vuex";

export default Vue.extend({
  data() {
    return {
      fontSize: 14,
    };
  },
  computed: {
    ...mapGetters({
      currentFontSize: 'settings/editorFontSize',
    }),
  },
  mounted() {
    // Initialize with current font size from store
    this.fontSize = this.currentFontSize;
    this.$root.$on('openEditorSettings', this.open);
  },
  beforeDestroy() {
    this.$root.$off('openEditorSettings', this.open);
  },
  methods: {
    open() {
      this.fontSize = this.currentFontSize;
      this.$modal.show('editor-settings-modal');
      this.$nextTick(() => {
        (this.$refs.fontSizeInput as HTMLInputElement).focus();
      });
    },
    close() {
      this.$modal.hide('editor-settings-modal');
    },
    async submit() {
      // Validate font size
      if (isNaN(this.fontSize) || this.fontSize < 8 || this.fontSize > 32) {
        this.$noty.error('Font size must be between 8 and 32 pixels');
        return;
      }
      // Save to store
      await this.$store.dispatch('settings/save', {
        key: 'editorFontSize',
        value: this.fontSize
      });
      this.$noty.success('Font size saved');
      this.close();
    },
  },
});
</script>

<style scoped>
.form-text {
  display: block;
  margin-top: 0.25rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
}
</style>
