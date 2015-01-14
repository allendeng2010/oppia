// Copyright 2014 The Oppia Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Utilities for interacting with forms when carrrying
 * out end-to-end testing with protractor.
 *
 * @author Jacob Davis (jacobdavis11@gmail.com)
 */

var widgets = require('../../../extensions/widgets/protractor.js');
var objects = require('../../../extensions/objects/protractor.js');

var DictionaryEditor = function(elem) {
  return {
    editEntry: function(index, objectType) {
      var entry = elem.element(by.repeater('property in propertySchemas()').
        row(index));
      var editor = getEditor(objectType);
      return editor(entry);
    }
  };
};

var ListEditor = function(elem) {
  // NOTE: this returns a promise, not an integer.
  var _getLength = function() {
    return elem.all(by.repeater('item in localValue track by $index')).
        then(function(items) {

      return items.length;
    });
  };
  // If objectType is specified this returns an editor for objects of that type
  // which can be used to make changes to the newly-added item (for example
  // by calling setValue() on it). Clients should ensure the given objectType
  // corresponds to the type of elements in the list.
  // If objectType is not specified, this function returns nothing.
  var addItem = function(objectType) {
    var listLength = _getLength();
    elem.element(by.css('.protractor-test-add-list-entry')).click();
    if (objectType) {
      return getEditor(objectType)(
        elem.element(
          by.repeater('item in localValue track by $index').row(listLength)));
    }
  };
  var deleteItem = function(index) {
    elem.element(
      by.repeater('item in localValue track by $index').row(index)
    ).element(by.css('.protractor-test-delete-list-entry')).click();
  };

  return {
    editItem: function(index, objectType) {
      var item = elem.element(
        by.repeater('item in localValue track by $index'
      ).row(index));
      var editor = getEditor(objectType);
      return editor(item);
    },
    addItem: addItem,
    deleteItem: deleteItem,
    // This will add or delete list elements as necessary
    setLength: function(desiredLength) {
      elem.all(by.repeater('item in localValue track by $index')).count().
          then(function(startingLength) {
        for (var i = startingLength; i < desiredLength; i++) {
          addItem();
        }
        for (var i = startingLength - 1; i >= desiredLength; i--) {
          deleteItem(i);
        }
    });
    }
  };
};

var RealEditor = function(elem) {
  return {
    setValue: function(value) {
      elem.element(by.tagName('input')).clear();
      elem.element(by.tagName('input')).sendKeys(value);
    }
  };
};

var RichTextEditor = function(elem) {
  var _appendContentText = function(text) {
    elem.element(by.tagName('rich-text-editor')).element(by.tagName('iframe')).
      sendKeys(text);
  };
  var _clickContentMenuButton = function(className) {
    elem.element(by.css('.wysiwyg')).element(by.css('.' + className)).click();
  };
  var _clearContent = function() {
    expect(elem.element(
      by.tagName('rich-text-editor')).element(by.tagName('iframe')).isPresent()
    ).toBe(true);
    browser.switchTo().frame(
      elem.element(by.tagName('rich-text-editor')).element(by.tagName('iframe')));
    // Angular is not present in this iframe, so we use browser.driver.
    browser.driver.findElement(by.tagName('body')).clear();
    browser.switchTo().defaultContent();
  };

  return {
    clear: function() {
      _clearContent();
    },
    setPlainText: function(text) {
      _clearContent();
      _appendContentText(text);
    },
    appendPlainText: function(text) {
      _appendContentText(text);
    },
    appendBoldText: function(text) {
      _clickContentMenuButton('bold');
      _appendContentText(text);
      _clickContentMenuButton('bold');
    },
    appendItalicText: function(text) {
      _clickContentMenuButton('italic');
      _appendContentText(text);
      _clickContentMenuButton('italic');
    },
    appendUnderlineText: function(text) {
      _clickContentMenuButton('underline');
      _appendContentText(text);
      _clickContentMenuButton('underline');
    },
    appendOrderedList: function(textArray) {
      _appendContentText('\n');
      _clickContentMenuButton('insertOrderedList');
      for (var i = 0; i < textArray.length; i++) {
        _appendContentText(textArray[i] + '\n');
      }
      _clickContentMenuButton('insertOrderedList');
    },
    appendUnorderedList: function(textArray) {
      _appendContentText('\n');
      _clickContentMenuButton('insertUnorderedList');
      for (var i = 0; i < textArray.length; i++) {
        _appendContentText(textArray[i] + '\n');
      }
      _clickContentMenuButton('insertUnorderedList');
    },
    appendHorizontalRule: function() {
      _clickContentMenuButton('insertHorizontalRule');
    },
    // This adds and customizes RTE extensions.
    // Additional arguments may be sent to this function, and they will be
    // passed on to the relevant extension editor.
    addExtension: function(extensionName) {
      _clickContentMenuButton('custom-command-' + extensionName.toLowerCase());

      // The currently active modal is the last in the DOM
      var modal = element.all(by.css('.modal-dialog')).last();

      // Need to convert arguments to an actual array; we tell the extension
      // which modal to act on but drop the extensionName.
      var args = [modal];
      for (var i = 1; i < arguments.length; i++) {
        args.push(arguments[i]);
      }
      widgets.getNoninteractive(extensionName).customizeWidget.apply(null, args);
      modal.element(by.css('.protractor-test-close-extension-editor')).click();
      // TODO (Jacob) remove when issue 422 is fixed
      elem.element(by.tagName('rich-text-editor')).
        element(by.tagName('iframe')).click();
    },
  };
};

var UnicodeEditor = function(elem) {
  return {
    setValue: function(text) {
      elem.element(by.tagName('input')).clear();
      elem.element(by.tagName('input')).sendKeys(text);
    }
  };
};

var AutocompleteDropdownEditor = function(elem) {
  return {
    setValue: function(text) {
      elem.element(by.css('.select2-container')).click();
      // NOTE: the input field is top-level in the DOM, and is outside the
      // context of 'elem'. The 'select2-drop' id is assigned to the input
      // field when it is 'activated', i.e. when the dropdown is clicked.
      element(by.id('select2-drop')).element(by.css('.select2-input')).
        sendKeys(text + '\n');
    },
    expectOptionsToBe: function(expectedOptions) {
      elem.element(by.css('.select2-container')).click();
      element(by.id('select2-drop')).all(by.tagName('li')).map(function(optionElem) {
        return optionElem.getText();
      }).then(function(actualOptions) {
        expect(actualOptions).toEqual(expectedOptions);
      });
      // Re-close the dropdown.
      element(by.id('select2-drop')).element(by.css('.select2-input')).
        sendKeys('\n');
    }
  };
};

var AutocompleteMultiDropdownEditor = function(elem) {
  return {
    setValues: function(texts) {
      // Clear all existing choices.
      elem.element(by.css('.select2-choices'))
          .all(by.tagName('li')).map(function(choiceElem) {
        return choiceElem.element(by.css('.select2-search-choice-close'));
      }).then(function(deleteButtons) {
        // We iterate in descending order, because clicking on a delete button
        // removes the element from the DOM. We also omit the last element
        // because it is the field for new input.
        for (var i = deleteButtons.length - 2; i >= 0; i--) {
          deleteButtons[i].click();
        }
      });

      for (var i = 0; i < texts.length; i++) {
        elem.element(by.css('.select2-container')).click();
        elem.element(by.css('.select2-input')).sendKeys(texts[i] + '\n');
      }
    },
    expectCurrentSelectionToBe: function(expectedCurrentSelection) {
      elem.element(by.css('.select2-choices'))
          .all(by.tagName('li')).map(function(choiceElem) {
        return choiceElem.getText();
      }).then(function(actualSelection) {
        // Remove the element corresponding to the last <li>, which actually
        // corresponds to the field for new input.
        actualSelection.pop();
        expect(actualSelection).toEqual(expectedCurrentSelection);
      });
    }
  };
};

// This function is sent 'elem', which should be the element immediately
// containing the various elements of a rich text area, for example
// <div>
//   plain
//   <b>bold</b>
//   <oppia-nointeractive-math> ... </oppia-noninteractive-math>
// <div>
// The richTextInstructions function will be supplied with a 'handler' argument
// which it should then use to read through the rich-text area using the functions
// supplied by the RichTextChecker below. In the example above richTextInstructions
// should consist of:
//   handler.readPlainText('plain');
//   handler.readBoldText('bold');
//   handler.readExtension('Math', ...);
var expectRichText = function(elem) {
  var toMatch = function(richTextInstructions) {
    // We remove all <span> elements since these are plain text that is
    // sometimes represented just by text nodes.
    elem.all(by.xpath('./*[not(self::span)]')).map(function(entry) {
      // It is necessary to obtain the texts of the elements in advance since
      // applying .getText() while the RichTextChecker is running would be
      // asynchronous and so not allow us to update the textPointer
      // synchronously.
      return entry.getText(function(text) {
        return text;
      });
    }).then(function(arrayOfTexts) {
      // We re-derive the array of elements as we need it too
      elem.all(by.xpath('./*[not(self::span)]')).then(function(arrayOfElements) {
        elem.getText().then(function(fullText) {
          var checker = RichTextChecker(
            arrayOfElements, arrayOfTexts, fullText);
          richTextInstructions(checker);
          checker.expectEnd();
        });
      });
    });
  };
  return {
    toMatch: toMatch,
    toEqual: function(text) {
      toMatch(function(checker) {
        checker.readPlainText(text);
      })
    }
  };
};

// This supplies functions to verify the contents of an area of the page that
// was created using a rich-text editor, e.g. <div>text<b>bold</b></div>.
// 'arrayOfElems': the array of promises of top-level element nodes in the
//   rich-text area, e.g [promise of <b>bold</b>].
// 'arrayOfTexts': the array of visible texts of top-level element nodes in
//   the rich-text area, obtained from getText(), e.g. ['bold'].
// 'fullText': a string consisting of all the visible text in the rich text
//   area (including both element and text nodes, so more than just the
//   concatenation of arrayOfTexts), e.g. 'textbold'.
var RichTextChecker = function(arrayOfElems, arrayOfTexts, fullText) {
  expect(arrayOfElems.length).toEqual(arrayOfTexts.length);
  // These are shared by the returned functions, and records how far through
  // the child elements and text of the rich text area checking has gone. The
  // arrayPointer traverses both arrays simultaneously.
  var arrayPointer = 0;
  var textPointer = 0;
  // Extensions insert line breaks above and below themselves and these are
  // recorded in fullText but not arrayOfTexts so we need to track them
  // specially.
  var justPassedExtension = false;

  var _readFormattedText = function(text, tagName) {
    expect(arrayOfElems[arrayPointer].getTagName()).toBe(tagName);
    expect(arrayOfElems[arrayPointer].getInnerHtml()).toBe(text);
    expect(arrayOfTexts[arrayPointer]).toEqual(text);
    arrayPointer = arrayPointer + 1;
    textPointer = textPointer + text.length;
    justPassedExtension = false;
  };

  return {
    readPlainText: function(text) {
      // Plain text is in a text node so not recorded in either array
      expect(
        fullText.substring(textPointer, textPointer + text.length)
      ).toEqual(text);
      textPointer = textPointer + text.length;
      justPassedExtension = false;
    },
    readBoldText: function(text) {
      _readFormattedText(text, 'b');
    },
    readItalicText: function(text) {
      _readFormattedText(text, 'i');
    },
    readUnderlineText: function(text) {
      _readFormattedText(text, 'u');
    },
    // TODO (Jacob) add functions for other rich text components
    // Additional arguments may be sent to this function, and they will be
    // passed on to the relevant extension editor.
    readExtension: function(extensionName) {
      var elem = arrayOfElems[arrayPointer];
      expect(elem.getTagName()).
        toBe('oppia-noninteractive-' + extensionName.toLowerCase());
      expect(elem.getText()).toBe(arrayOfTexts[arrayPointer]);

      // Need to convert arguments to an actual array; we tell the extension
      // which element to act on but drop the extensionName.
      var args = [elem];
      for (var i = 1; i < arguments.length; i++) {
        args.push(arguments[i]);
      }
      widgets.getNoninteractive(extensionName).
        expectWidgetDetailsToMatch.apply(null, args);
      textPointer = textPointer + arrayOfTexts[arrayPointer].length +
        (justPassedExtension ? 1 : 2);
      arrayPointer = arrayPointer + 1;
      justPassedExtension = true;
    },
    expectEnd: function() {
      expect(arrayPointer).toBe(arrayOfElems.length);
    }
  }
};

// This converts a string into a function that represents rich text, which can then
// be sent to either editRichText() or expectRichText(). The string should not
// contain any html formatting. In the first case the function created will
// write the given text into the rich text editor (as plain text), and in
// the second it will verify that the html created by a rich text editor
// consists of the given text (without any formatting).
//   This is necessary because the Protractor tests do not have an abstract
// representation of a 'rich text object'. This is because we are more
// interested in the process of interacting with the page than in the
// information thereby conveyed.
var toRichText = function(text) {
  // The 'handler' should be either a RichTextEditor or RichTextChecker
  return function(handler) {
    if (handler.hasOwnProperty('setPlainText')) {
      handler.setPlainText(text);
    } else {
      handler.readPlainText(text);
    }
  };
};


// This is used by the list and dictionary editors to retrieve the editors of
// their entries dynamically.
var FORM_EDITORS = {
  'Dictionary': DictionaryEditor,
  'List': ListEditor,
  'Real': RealEditor,
  'RichText': RichTextEditor,
  'Unicode': UnicodeEditor
};

var getEditor = function(formName) {
  if (FORM_EDITORS.hasOwnProperty(formName)) {
    return FORM_EDITORS[formName];
  } else if (objects.OBJECT_EDITORS.hasOwnProperty(formName)) {
    return objects.OBJECT_EDITORS[formName];
  } else {
    throw Error('Unknown form / object requested: ' + formName)
  }
};

exports.DictionaryEditor = DictionaryEditor;
exports.ListEditor = ListEditor;
exports.RealEditor = RealEditor;
exports.RichTextEditor = RichTextEditor;
exports.UnicodeEditor = UnicodeEditor;
exports.AutocompleteDropdownEditor = AutocompleteDropdownEditor;
exports.AutocompleteMultiDropdownEditor = AutocompleteMultiDropdownEditor;

exports.expectRichText = expectRichText;
exports.RichTextChecker = RichTextChecker;
exports.toRichText = toRichText;

exports.getEditor = getEditor;
