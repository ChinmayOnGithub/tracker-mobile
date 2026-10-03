package com.chinmaypatil.tracker.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import com.chinmaypatil.tracker.R
import org.json.JSONObject

class TodayWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val views = RemoteViews(context.packageName, R.layout.tracker_today_widget)

            // Read snapshot from SharedPreferences
            val prefs = context.getSharedPreferences("TrackerWidgetStorage", Context.MODE_PRIVATE)
            val snapshotJsonStr = prefs.getString("tracker_widget_snapshot", null)

            if (!snapshotJsonStr.isNullOrEmpty()) {
                try {
                    val snapshot = JSONObject(snapshotJsonStr)
                    val today = snapshot.optJSONObject("today")
                    val completed = today?.optInt("completedCount", 0) ?: 0
                    val total = today?.optInt("totalCount", 0) ?: 0
                    val percent = today?.optInt("progressPercent", 0) ?: 0

                    views.setTextViewText(R.id.widget_progress_text, "$completed / $total Complete")
                    views.setProgressBar(R.id.widget_progress_bar, 100, percent, false)

                    val nextTask = today?.optJSONObject("nextTask")
                    if (nextTask != null) {
                        val title = nextTask.optString("title", "No upcoming task")
                        val time = nextTask.optString("time", "")
                        views.setTextViewText(R.id.widget_next_task_title, title)
                        if (time.isNotEmpty() && time != "null") {
                            views.setViewVisibility(R.id.widget_next_task_time, View.VISIBLE)
                            views.setTextViewText(R.id.widget_next_task_time, time)
                        } else {
                            views.setViewVisibility(R.id.widget_next_task_time, View.GONE)
                        }
                    } else {
                        views.setTextViewText(R.id.widget_next_task_title, "All tasks completed!")
                        views.setViewVisibility(R.id.widget_next_task_time, View.GONE)
                    }
                } catch (e: Exception) {
                    views.setTextViewText(R.id.widget_progress_text, "Tracker")
                    views.setTextViewText(R.id.widget_next_task_title, "Tap to open schedule")
                }
            } else {
                views.setTextViewText(R.id.widget_progress_text, "Tracker")
                views.setTextViewText(R.id.widget_next_task_title, "Tap to view today's tasks")
            }

            // Click action deep links to tracker://today
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("tracker://today")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        fun notifyAllWidgets(context: Context) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val thisWidget = ComponentName(context, TodayWidgetProvider::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)
            for (appWidgetId in appWidgetIds) {
                updateAppWidget(context, appWidgetManager, appWidgetId)
            }
        }
    }
}
