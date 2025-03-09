import sys
from PyQt5.QtWidgets import QApplication, QWidget
from PyQt5.QtCore import QUrl, pyqtSlot
from PyQt5.QtPrintSupport import QPrinter
from PyQt5.QtWebEngineWidgets import QWebEngineView, QWebChannel  # Corrected import here


class WebPagePrinter(QWidget):
    def __init__(self):
        super().__init__()
        self.initUI()

    def initUI(self):
        self.web_view = QWebEngineView()
        # Use the absolute path with either a raw string or normal string with forward slashes
        path = r'C:/Users/Administrator/Desktop/invoice/EditableInvoice/index.html'
        self.web_view.load(QUrl.fromLocalFile(path))
        self.web_view.loadFinished.connect(self.on_load_finished)

        self.setGeometry(300, 300, 800, 600)
        self.setWindowTitle('HTML Page Printer')

    def on_load_finished(self, success):
        if success:
            # Set up the QWebChannel and expose the Python object
            channel = QWebChannel()
            self.web_view.page().setWebChannel(channel)
            channel.registerObject('pyObj', self)
            
            # Inject JavaScript to handle the print button click
            self.web_view.page().runJavaScript(
                "document.getElementById('printButton').addEventListener('click', () => { pyObj.print_page(); });"
            )
            print("JS injected successfully and page loaded.")
        else:
            print("Failed to load the page.")

    @pyqtSlot()
    def print_page(self):
        print("Print command triggered")
        printer = QPrinter(QPrinter.HighResolution)
        printer.setPageSize(QPrinter.A4)
        printer.setColorMode(QPrinter.Color)
        printer.setPageMargins(12, 16, 12, 20, QPrinter.Millimeter)
        
        # Direct print without showing a dialog
        self.web_view.page().print(printer, self.print_completed)

    def print_completed(self, success):
        if success:
            print("Printed Successfully")
        else:
            print("Failed to Print")

if __name__ == '__main__':
    app = QApplication(sys.argv)
    web_printer = WebPagePrinter()
    web_printer.show()
    sys.exit(app.exec_())
