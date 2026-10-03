const { withAndroidManifest, withDangerousMod, withStringsXml } = require('@expo/config-plugins')
const fs = require('fs')
const path = require('path')

/**
 * Expo Config Plugin to install the native Android Today Widget
 */
function withAndroidWidget(config) {
  // 1. Add widget description to strings.xml
  config = withStringsXml(config, (xmlConfig) => {
    const strings = xmlConfig.modResults.resources.string || []
    if (!strings.some((s) => s.$.name === 'widget_today_description')) {
      strings.push({
        $: { name: 'widget_today_description' },
        _: "Tracker today's task progress and next upcoming activity.",
      })
    }
    xmlConfig.modResults.resources.string = strings
    return xmlConfig
  })

  // 2. Add widget receiver to AndroidManifest.xml
  config = withAndroidManifest(config, (manifestConfig) => {
    const mainApplication = manifestConfig.modResults.manifest.application?.[0]
    if (!mainApplication) return manifestConfig

    mainApplication.receiver = mainApplication.receiver || []

    const receiverName = 'com.chinmaypatil.tracker.widget.TodayWidgetProvider'
    const alreadyExists = mainApplication.receiver.some(
      (r) => r.$['android:name'] === receiverName || r.$['android:name'] === '.widget.TodayWidgetProvider'
    )

    if (!alreadyExists) {
      mainApplication.receiver.push({
        $: {
          'android:name': '.widget.TodayWidgetProvider',
          'android:exported': 'true',
          'android:label': 'Tracker Today',
        },
        'intent-filter': [
          {
            action: [
              {
                $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' },
              },
            ],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.appwidget.provider',
              'android:resource': '@xml/tracker_today_widget_info',
            },
          },
        ],
      })
    }

    return manifestConfig
  })

  // 3. Copy files during dangerous mod phase
  config = withDangerousMod(config, [
    'android',
    async (dangerousConfig) => {
      const projectRoot = dangerousConfig.modRequest.projectRoot
      const androidRoot = path.join(projectRoot, 'android')
      if (!fs.existsSync(androidRoot)) {
        return dangerousConfig
      }

      const resDir = path.join(androidRoot, 'app', 'src', 'main', 'res')
      const layoutDir = path.join(resDir, 'layout')
      const xmlDir = path.join(resDir, 'xml')
      const drawableDir = path.join(resDir, 'drawable')
      const widgetFilesDir = path.join(projectRoot, 'plugins', 'widget-files')

      // Ensure target directories exist
      fs.mkdirSync(layoutDir, { recursive: true })
      fs.mkdirSync(xmlDir, { recursive: true })
      fs.mkdirSync(drawableDir, { recursive: true })

      // Copy layout & drawable files
      fs.copyFileSync(
        path.join(widgetFilesDir, 'tracker_today_widget.xml'),
        path.join(layoutDir, 'tracker_today_widget.xml')
      )
      fs.copyFileSync(
        path.join(widgetFilesDir, 'tracker_today_widget_info.xml'),
        path.join(xmlDir, 'tracker_today_widget_info.xml')
      )
      fs.copyFileSync(
        path.join(widgetFilesDir, 'tracker_widget_bg.xml'),
        path.join(drawableDir, 'tracker_widget_bg.xml')
      )
      fs.copyFileSync(
        path.join(widgetFilesDir, 'tracker_widget_card_bg.xml'),
        path.join(drawableDir, 'tracker_widget_card_bg.xml')
      )

      // Copy Kotlin source files to package directory
      const kotlinPackageDir = path.join(
        androidRoot,
        'app',
        'src',
        'main',
        'java',
        'com',
        'chinmaypatil',
        'tracker',
        'widget'
      )
      fs.mkdirSync(kotlinPackageDir, { recursive: true })

      fs.copyFileSync(
        path.join(widgetFilesDir, 'TodayWidgetProvider.kt'),
        path.join(kotlinPackageDir, 'TodayWidgetProvider.kt')
      )
      fs.copyFileSync(
        path.join(widgetFilesDir, 'TrackerWidgetModule.kt'),
        path.join(kotlinPackageDir, 'TrackerWidgetModule.kt')
      )
      fs.copyFileSync(
        path.join(widgetFilesDir, 'TrackerWidgetPackage.kt'),
        path.join(kotlinPackageDir, 'TrackerWidgetPackage.kt')
      )

      return dangerousConfig
    },
  ])

  return config
}

module.exports = withAndroidWidget
