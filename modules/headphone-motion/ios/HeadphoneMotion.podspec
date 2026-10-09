Pod::Spec.new do |s|
  s.name           = 'HeadphoneMotion'
  s.version        = '1.0.0'
  s.summary        = 'AirPods head motion (CMHeadphoneMotionManager) for Expo'
  s.description    = 'Streams AirPods head motion to JS and plays directional audio cues.'
  s.author         = ''
  s.homepage       = 'https://github.com/hwanify/neck-posture'
  s.platforms      = {
    :ios => '16.4'
  }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'CoreMotion', 'AVFoundation'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
