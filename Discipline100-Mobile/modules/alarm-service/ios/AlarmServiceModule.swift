import ExpoModulesCore

#if canImport(AlarmKit)
import AlarmKit
#endif

public class AlarmServiceModule: Module {

  public func definition() -> ModuleDefinition {
    Name("AlarmService")

    AsyncFunction("scheduleAlarm") { (config: [String: Any]) -> Bool in
      #if canImport(AlarmKit)
      if #available(iOS 26, *) {
        guard let id = config["id"] as? String,
              let hour = config["hour"] as? Int,
              let minute = config["minute"] as? Int else {
          return false
        }
        let title = config["title"] as? String ?? "Discipline100 — Wake Up!"
        let alarmManager = AlarmManager.shared
        guard alarmManager.authorizationState == .authorized else {
          return false
        }
        do {
          let alert = AlarmPresentation.Alert(
            title: LocalizedStringResource(stringLiteral: title),
            stopButton: AlarmPresentation.Alert.Button(
              LocalizedStringResource(stringLiteral: "I'm Up!")
            ),
            secondaryButton: AlarmPresentation.Alert.Button(
              LocalizedStringResource(stringLiteral: "Snooze")
            )
          )
          let alarm = Alarm(
            id: id,
            schedule: .daily(hour: hour, minute: minute),
            presentation: .alert(alert)
          )
          try await alarm.schedule()
          return true
        } catch {
          print("AlarmService: Failed to schedule alarm: \(error)")
          return false
        }
      }
      #endif
      return false
    }

    AsyncFunction("cancelAlarm") { (id: String) in
      #if canImport(AlarmKit)
      if #available(iOS 26, *) {
        do {
          try await Alarm.cancel(id: id)
        } catch {
          print("AlarmService: Failed to cancel alarm: \(error)")
        }
      }
      #endif
    }

    AsyncFunction("cancelAllAlarms") {
      #if canImport(AlarmKit)
      if #available(iOS 26, *) {
        do {
          try await Alarm.cancelAll()
        } catch {
          print("AlarmService: Failed to cancel all alarms: \(error)")
        }
      }
      #endif
    }

    AsyncFunction("requestPermission") { () -> Bool in
      #if canImport(AlarmKit)
      if #available(iOS 26, *) {
        let alarmManager = AlarmManager.shared
        switch alarmManager.authorizationState {
        case .notDetermined:
          do {
            let state = try await alarmManager.requestAuthorization()
            return state == .authorized
          } catch {
            print("AlarmService: Authorization error: \(error)")
            return false
          }
        case .authorized:
          return true
        case .denied:
          return false
        @unknown default:
          return false
        }
      }
      #endif
      return false
    }

    AsyncFunction("hasPermission") { () -> Bool in
      #if canImport(AlarmKit)
      if #available(iOS 26, *) {
        return AlarmManager.shared.authorizationState == .authorized
      }
      #endif
      return false
    }

    AsyncFunction("stopAlarmSound") {
      // AlarmKit handles sound automatically — no-op on iOS
    }
  }
}
