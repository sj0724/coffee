import ExpoModulesCore
import Vision
import CoreImage
import UIKit

public class DocumentScannerModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DocumentScanner")

    // 사각형 자동 감지 후 원근 보정 크롭, 결과 URI 반환
    // 사각형을 찾지 못하면 원본 URI 그대로 반환
    AsyncFunction("detectAndCrop") { (uriString: String) -> String in
      return try detectAndCrop(uriString: uriString)
    }

    // 사각형 꼭짓점 좌표만 반환 (미리보기용)
    // 못 찾으면 nil 반환
    AsyncFunction("detectCorners") { (uriString: String) -> [String: Double]? in
      return try detectCorners(uriString: uriString)
    }

    // 꼭짓점 좌표를 직접 넣어서 크롭
    AsyncFunction("cropWithCorners") { (uriString: String, corners: [String: Double]) -> String in
      return try cropWithCorners(uriString: uriString, corners: corners)
    }
  }
}

// MARK: - Helpers

// EXIF 방향 정보를 픽셀 데이터에 직접 반영해서 항상 .up 상태의 이미지로 반환
private func normalizeOrientation(_ image: UIImage) -> UIImage {
  guard image.imageOrientation != .up else { return image }
  UIGraphicsBeginImageContextWithOptions(image.size, false, image.scale)
  defer { UIGraphicsEndImageContext() }
  image.draw(in: CGRect(origin: .zero, size: image.size))
  return UIGraphicsGetImageFromCurrentImageContext() ?? image
}

private func loadImage(from uriString: String) throws -> (UIImage, CGImage, CIImage) {
  let url: URL
  if uriString.hasPrefix("file://") {
    guard let u = URL(string: uriString) else { throw ScanError.invalidURI }
    url = u
  } else {
    url = URL(fileURLWithPath: uriString)
  }
  guard let data = try? Data(contentsOf: url),
        let raw = UIImage(data: data) else {
    throw ScanError.loadFailed
  }
  let uiImage = normalizeOrientation(raw)
  guard let cgImage = uiImage.cgImage else { throw ScanError.loadFailed }
  let ciImage = CIImage(cgImage: cgImage)
  return (uiImage, cgImage, ciImage)
}

private func saveImage(_ ciImage: CIImage) throws -> String {
  let context = CIContext()
  guard let cgOutput = context.createCGImage(ciImage, from: ciImage.extent) else {
    throw ScanError.encodeFailed
  }
  let output = UIImage(cgImage: cgOutput)
  guard let jpegData = output.jpegData(compressionQuality: 0.92) else {
    throw ScanError.encodeFailed
  }
  let filename = UUID().uuidString + ".jpg"
  let outputURL = FileManager.default.temporaryDirectory.appendingPathComponent(filename)
  try jpegData.write(to: outputURL)
  return outputURL.absoluteString
}

private func runRectangleDetection(on cgImage: CGImage) throws -> VNRectangleObservation? {
  let request = VNDetectRectanglesRequest()
  request.minimumAspectRatio = 0.3
  request.maximumAspectRatio = 1.0
  request.minimumSize = 0.2          // 화면의 20% 이상 차지하는 사각형만
  request.maximumObservations = 1    // 가장 신뢰도 높은 1개만

  let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
  try handler.perform([request])
  return request.results?.first as? VNRectangleObservation
}

// Vision 정규화 좌표(좌하단 원점) → Core Image 픽셀 좌표(좌하단 원점)
private func toCI(_ point: CGPoint, size: CGSize) -> CIVector {
  return CIVector(x: point.x * size.width, y: point.y * size.height)
}

private func applyPerspectiveCorrection(
  ciImage: CIImage,
  obs: VNRectangleObservation
) -> CIImage {
  let size = ciImage.extent.size
  return ciImage.applyingFilter("CIPerspectiveCorrection", parameters: [
    "inputTopLeft":     toCI(obs.topLeft,     size: size),
    "inputTopRight":    toCI(obs.topRight,    size: size),
    "inputBottomLeft":  toCI(obs.bottomLeft,  size: size),
    "inputBottomRight": toCI(obs.bottomRight, size: size),
  ])
}

// MARK: - Exported functions

private func detectAndCrop(uriString: String) throws -> String {
  let (_, cgImage, ciImage) = try loadImage(from: uriString)
  guard let obs = try runRectangleDetection(on: cgImage) else {
    return uriString  // 사각형 못 찾으면 원본 반환
  }
  let corrected = applyPerspectiveCorrection(ciImage: ciImage, obs: obs)
  return try saveImage(corrected)
}

private func detectCorners(uriString: String) throws -> [String: Double]? {
  let (_, cgImage, _) = try loadImage(from: uriString)
  guard let obs = try runRectangleDetection(on: cgImage) else { return nil }
  return [
    "topLeftX":     Double(obs.topLeft.x),
    "topLeftY":     Double(obs.topLeft.y),
    "topRightX":    Double(obs.topRight.x),
    "topRightY":    Double(obs.topRight.y),
    "bottomLeftX":  Double(obs.bottomLeft.x),
    "bottomLeftY":  Double(obs.bottomLeft.y),
    "bottomRightX": Double(obs.bottomRight.x),
    "bottomRightY": Double(obs.bottomRight.y),
  ]
}

private func cropWithCorners(uriString: String, corners: [String: Double]) throws -> String {
  let (_, _, ciImage) = try loadImage(from: uriString)
  let size = ciImage.extent.size

  let obs = VNRectangleObservation()  // 좌표만 빌려쓰는 용도
  // corners를 직접 CIVector로 변환
  guard let tlx = corners["topLeftX"],     let tly = corners["topLeftY"],
        let trx = corners["topRightX"],    let try_ = corners["topRightY"],
        let blx = corners["bottomLeftX"],  let bly = corners["bottomLeftY"],
        let brx = corners["bottomRightX"], let bry = corners["bottomRightY"] else {
    throw ScanError.invalidCorners
  }
  let corrected = ciImage.applyingFilter("CIPerspectiveCorrection", parameters: [
    "inputTopLeft":     CIVector(x: tlx * size.width,  y: tly * size.height),
    "inputTopRight":    CIVector(x: trx * size.width,  y: try_ * size.height),
    "inputBottomLeft":  CIVector(x: blx * size.width,  y: bly * size.height),
    "inputBottomRight": CIVector(x: brx * size.width,  y: bry * size.height),
  ])
  return try saveImage(corrected)
}

// MARK: - Errors

private enum ScanError: Error {
  case invalidURI
  case loadFailed
  case encodeFailed
  case invalidCorners
}
