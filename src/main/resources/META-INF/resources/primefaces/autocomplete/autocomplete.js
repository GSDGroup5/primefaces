PrimeFaces.widget.AutoComplete = function(id, cfg) {
    this.id = id;
    this.cfg = cfg;
    this.jqId = PrimeFaces.escapeClientId(this.id);
    this.jq = $(this.jqId);
    this.input = $(this.jqId + '_input');
    this.hinput = $(this.jqId + '_hinput');
    this.panel = this.jq.children('.ui-autocomplete-panel');
    
    //options
    this.cfg.minLength = this.cfg.minLength ? this.cfg.minLength : 1;
    this.cfg.delay = this.cfg.delay ? this.cfg.delay : 300;
    
    //visuals
    if(this.cfg.theme != false) {
        PrimeFaces.skinInput(this.input);
    }
    
    //bind key and mouse events
    this.bindEvents();
    
    //force selection
    if(this.cfg.forceSelection) {
        this.setupForceSelection();
    }
}

PrimeFaces.widget.AutoComplete.prototype.bindEvents = function() {
    var _self = this,
    items = $(_self.jqId + ' .ui-autocomplete-item');
    
    //bind keyup handler
    this.jq.keyup(function() {
        var value = _self.input.val();
        
        if(value.length >= _self.cfg.minLength) {
            
            //Cancel the search request if user types within the timeout
            if(_self.timeout) {
                clearTimeout(_self.timeout);
            }

            _self.timeout = setTimeout(function() {
                                _self.search(value);
                            }, 
                            _self.cfg.delay);
        }
    });
  
    //key events
    this.input.keydown(function(e) {
        var keyCode = $.ui.keyCode,
        currentItems = _self.panel.find('.ui-autocomplete-item'),
        highlightItem = _self.panel.find('.ui-autocomplete-item.ui-state-highlight');
        
         switch(e.which) {
            case keyCode.UP:
            case keyCode.LEFT:
                break;
                
            case keyCode.DOWN:
            case keyCode.RIGHT:
                alert('right');
                if(highlightItem.length > 0) {
                    highlightItem.removeClass('.ui-state-highlight').next().addClass('.ui-state-highlight')
                } else {
                    currentItems.eq(0).addClass('.ui-state-highlight');
                }
                break;
                
            case keyCode.ENTER:
            case keyCode.NUMPAD_ENTER:
                break;
                
            case keyCode.ALT: 
            case 224: 
                break;
                
            case keyCode.TAB: 
                _self.hide();
                break;
         }
    });
    
    //visuals and click handler for items
    items.die().live('mouseover', function() {
        $(this).addClass('ui-state-highlight');
    })
    .live('mouseout', function() {
        $(this).removeClass('ui-state-highlight');
    })
    .live('click', function(event) {
        var item = $(this);
        
        _self.input.val(item.attr('data-item-label'));
        
        if(_self.cfg.pojo) {
            _self.hinput.val(item.attr('data-item-value'));            
        } 

        _self.invokeItemSelectBehavior(event);
    });
    
    //hide overlay when outside is clicked
    var offset;
    $(document.body).bind('click', function (e) {
        if(_self.panel.is(":hidden")) {
            return;
        }
        offset = _self.panel.offset();
        if(e.target === _self.input.get(0)) {
            return;
        }
        if (e.pageX < offset.left ||
            e.pageX > offset.left + _self.panel.width() ||
            e.pageY < offset.top ||
            e.pageY > offset.top + _self.panel.height()) {
            _self.hide();
        }
        _self.hide();
    });
}

PrimeFaces.widget.AutoComplete.prototype.search = function(value) {
    var _self = this;
    
    //start callback
    if(this.cfg.onstart) {
        this.cfg.onstart.call(this, value);
    }

    var options = {
        source: this.id,
        process: this.id,
        update: this.id,
        formId: this.cfg.formId,
        onsuccess: function(responseXML) {
            var xmlDoc = responseXML.documentElement,
            updates = xmlDoc.getElementsByTagName("update");

            for(var i=0; i < updates.length; i++) {
                var id = updates[i].attributes.getNamedItem("id").nodeValue,
                data = updates[i].firstChild.data;

                if(id == _self.id) {
                    _self.panel.html(data);
                    
                    var items = _self.panel.find('.ui-autocomplete-item');
                    
                    if(items.length > 0) {
                        if(_self.cfg.forceSelection) {
                            _self.cachedResults = [];
                            items.each(function(i, item) {
                               _self.cachedResults.push($(item).attr('data-item-label'));
                            });
                        }
                        
                        if(_self.panel.is(':hidden')) {
                            _self.show();
                        }

                        //adjust height
                        _self.panel.css('height', '');
                        if(_self.cfg.scrollHeight && _self.panel.height() > _self.cfg.scrollHeight) {
                            _self.panel.css('height', _self.cfg.scrollHeight + 'px');
                        }
                    } 
                    else {
                        _self.panel.hide();
                    }
                } 
                else {
                    PrimeFaces.ajax.AjaxUtils.updateElement(id, data);
                }
            }

            return true;
        }
    };
    
    //complete callback
    if(this.cfg.oncomplete) {
        options.complete = this.cfg.oncomplete;
    }

    if(this.cfg.global === false) {
        options.global = false;
    }

    var params = {};
    params[this.id + '_query'] = encodeURIComponent(value);

    options.params = params;

    PrimeFaces.ajax.AjaxRequest(options);
}

PrimeFaces.widget.AutoComplete.prototype.show = function() {
    this.panel.css('z-index', '100000');
    
    if($.browser.msie && /^[6,7]\.[0-9]+/.test($.browser.version)) {
        this.panel.parent().css('z-index', '99999');
    }

    if(this.cfg.effect)
        this.panel.show(this.cfg.effect, {}, this.cfg.effectDuration);
    else
        this.panel.show();
}

PrimeFaces.widget.AutoComplete.prototype.hide = function() {
    if($.browser.msie && /^[6,7]\.[0-9]+/.test($.browser.version)) {
        this.panel.parent().css('z-index', '');
    }
    
    this.panel.css('z-index', '').hide();
}

PrimeFaces.widget.AutoComplete.prototype.invokeItemSelectBehavior = function(event) {
    if(this.cfg.behaviors) {
        var itemSelectBehavior = this.cfg.behaviors['itemSelect'];

        if(itemSelectBehavior) {
            itemSelectBehavior.call(this, event);
        }
    }
}

PrimeFaces.widget.AutoComplete.prototype.setupForceSelection = function() {
    var _self = this;
	
    this.input.blur(function() {
        var value = $(this).val(),
        valid = false;
		
        if(_self.cachedResults) {
            for(var i = 0; i < _self.cachedResults.length; i++) {
                if(_self.cachedResults[i] == value) {
                    valid = true;
                    break;
                }
            }
        }
		
        if(!valid) {
            $(this).val('');
        }
    });
}

/**
 * PrimeFaces AutoComplete Widget
 */
/*PrimeFaces.widget.AutoComplete = function(id, cfg) {
    this.id = id;
    this.cfg = cfg;
    this.jqId = PrimeFaces.escapeClientId(id);
    this.jq = jQuery(this.jqId + '_input');
    this.jqh = jQuery(this.jqId + '_hinput');
    this.cfg.formId = this.jq.parents('form:first').attr('id');
	
    this.setupDataSource();
		
    this.jq.autocomplete(this.cfg);

    var _self = this;

    //Item select handler
    this.jq.bind('autocompleteselect', function(event, ui) {
        _self.onItemSelect(event, ui);
    });
	
    if(this.cfg.forceSelection) {
        this.setupForceSelection();
    }

    //Update hidden field value in pojo mode
    if(this.cfg.pojo) {
        this.jq.keyup(function(e) {
            if(e.keyCode != 13) {
                jQuery(_self.jqh).val(jQuery(this).val());
            }
        });
    }

    //Client Behaviors
    if(this.cfg.behaviors) {
        PrimeFaces.attachBehaviors(this.jq, this.cfg.behaviors);
    }

    //Visuals
    if(this.cfg.theme != false) {
        PrimeFaces.skinInput(this.jq);
    }
}

PrimeFaces.widget.AutoComplete.prototype.setupDataSource = function() {
    var _self = this;
	
    this.cfg.source = function(request, response) {
        //start callback
        if(_self.cfg.onstart) {
            _self.cfg.onstart.call(_self, request);
        }

        var options = {
            source: _self.id,
            process: _self.id,
            update: _self.id,
            formId: _self.cfg.formId,
            onsuccess: function(responseXML) {
                var xmlDoc = responseXML.documentElement,
                updates = xmlDoc.getElementsByTagName("update");

                for(var i=0; i < updates.length; i++) {
                    var id = updates[i].attributes.getNamedItem("id").nodeValue,
                    data = updates[i].firstChild.data;

                    if(id == _self.id){
                        var results = jQuery.parseJSON(data).results;

                        //complete callback
                        if(_self.cfg.oncomplete) {
                            _self.cfg.oncomplete.call(_self, results);
                        }

                        //max results
                        if(_self.cfg.maxResults < results.length) {
                            results = results.slice(0, _self.cfg.maxResults);
                        }

                        //force selection
                        if(_self.cfg.forceSelection) {
                            _self.cachedResults = results;
                        }

                        response(results);

                    } else {
                        PrimeFaces.ajax.AjaxUtils.updateElement(id, data);
                    }
                }

                return true;
            }
        };
        
        if(_self.cfg.global === false) {
            options.global = false;
        }

        var params = {};
        params[_self.id + '_query'] = encodeURIComponent(request.term);

        options.params = params;

        PrimeFaces.ajax.AjaxRequest(options);
        
    };
}

PrimeFaces.widget.AutoComplete.prototype.onItemSelect = function(event, ui) {
    if(this.cfg.pojo)
        this.jqh.val(ui.item.data);
    else
        this.jq.val(ui.item.label);
	
    //Fire instant selection event
    if(this.cfg.behaviors) {
        var itemSelectBehavior = this.cfg.behaviors['itemSelect'];
        if(itemSelectBehavior) {
            itemSelectBehavior.call(this, event);
        }
    }
}

PrimeFaces.widget.AutoComplete.prototype.setupForceSelection = function() {
    var _self = this;
	
    this.jq.blur(function() {
        var value = jQuery(this).val(),
        valid = false;
		
        if(_self.cachedResults) {
            for(var i = 0; i < _self.cachedResults.length; i++) {
                if(_self.cachedResults[i].label == value) {
                    valid = true;
                    break;
                }
            }
        }
		
        if(!valid) {
            jQuery(this).val('');
        }
    });
}

PrimeFaces.widget.AutoComplete.prototype.disable = function() {
    this.jq.addClass('ui-state-disabled').attr('disabled', 'disabled').autocomplete('disable');
}

PrimeFaces.widget.AutoComplete.prototype.enable = function() {
    this.jq.removeClass('ui-state-disabled').removeAttr('disabled').autocomplete('enable');
}

PrimeFaces.widget.AutoComplete.prototype.search = function(value) {
    this.jq.autocomplete('search', value);
}

PrimeFaces.widget.AutoComplete.prototype.close = function() {
    this.jq.autocomplete('close');
}

PrimeFaces.widget.AutoComplete.prototype.deactivate = function() {
    this.jq.autocomplete('disable');
}

PrimeFaces.widget.AutoComplete.prototype.activate = function() {
    this.jq.autocomplete('enable');
}*/