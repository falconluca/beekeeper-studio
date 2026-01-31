<template>
  <div class="global-items">
    <a
      href=""
      @click.prevent="$emit('select', 'tables')"
      class="nav-item selectable"
      :class="{ active: activeItem === 'tables'}"
      title="Database"
    >
      <span class="bk-database" />
    </a>
    <a
      href=""
      @click.prevent="$emit('select', 'queries')"
      class="nav-item selectable"
      :class="{ active: activeItem === 'queries'}"
      title="Saved Queries"
    >
      <span class="material-icons">code</span>
    </a>
    <a
      href=""
      @click.prevent="$emit('select', 'history')"
      class="nav-item selectable"
      :class="{ active: activeItem === 'history'}"
      title="Run History"
    >
      <span class="material-icons">history</span>
    </a>
    <span class="expand" />
    <core-account-button v-if="$store.state.workspaceId > 0" />
    <a
      href=""
      @click.prevent="openSettings"
      class="nav-item settings"
      title="Editor Settings"
    >
      <span class="material-icons">settings</span>
    </a>
  </div>
</template>

<script>
  import CoreAccountButton from './core/CoreAccountButton.vue'
  export default {
    props: ['activeItem'],
    components: { CoreAccountButton },
    methods: {
      openSettings() {
        this.$modal.show('editor-settings-modal')
      }
    }
  }
</script>
