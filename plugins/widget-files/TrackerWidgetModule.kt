package com.chinmaypatil.tracker.widget

import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class TrackerWidgetModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "TrackerWidgetModule"
    }

    @ReactMethod
    fun updateWidgetSnapshot(json: String, promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("TrackerWidgetStorage", Context.MODE_PRIVATE)
            prefs.edit().putString("tracker_widget_snapshot", json).apply()
            TodayWidgetProvider.notifyAllWidgets(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("WIDGET_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun reloadAllWidgets(promise: Promise) {
        try {
            TodayWidgetProvider.notifyAllWidgets(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("WIDGET_ERROR", e.message, e)
        }
    }
}
