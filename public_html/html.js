// html operations
var html = {
    id: function(id)
    {
        return document.getElementById(id);
    },
    setContent: function(e, v, fnc)
    {
        if(!e)
        {
            return;
        }
        
        fnc = fnc || function(v){return v;};
        
        if(Array.isArray(v))
        {
            e.innerHTML = '';
            var addList = function(list, fnc)
            {
                fnc = fnc || function(v){return v;};
                
                for(var i=0;i<list.length;++i)
                {
                    elem = fnc(list[i]);
                    if(Array.isArray(elem))
                    {
                        addList(elem);
                    }
                    else if(typeof elem === 'string' || typeof elem === 'number')
                    {
                        e.appendChild(html.div('', elem));
                    }
                    else if(elem && elem.tagName)
                    {
                        e.appendChild(elem);
                    }
                }
            };
            addList(v, fnc);
        }
        else if(typeof v === 'string' || typeof v === 'number')
        {
            if((e.tagName +'').toLowerCase() === 'input')
            {
                // element is input
                e.value = fnc(v);
            }
            else
            {
                // element is container for string
                e.innerText = fnc(v);
            }
        }
        else if(v && v.tagName)
        {
            // element is container for element
            e.innerHTML = '';
            e.appendChild(fnc(v));
        }
        else
        {
            v = fnc(v);
            
            if(v || typeof v === 'string' || typeof v === 'number')
            {
                setContent(e, v);
            }
        }
    },
    h1: function(txt)
    {
        return html.element('h1', txt);
    },
    h2: function(txt)
    {
        return html.element('h2', txt);
    },
    h3: function(txt)
    {
        return html.element('h3', txt);
    },
    p: function(txt)
    {
        return html.element('p', txt);
    },
    ul: function(list)
    {
        var e = document.createElement('ul');
        html.setContent(e, list, function(item)
        {
            if(!item)
            {
                return false;
            }
            if(html.tag(item) === 'li')
            {
                return item;
            }
            return html.li(item);
        });
        return e;
    },
    li: function(txt)
    {
        return html.element('li', txt);
    },
    button: function(txt, fnc)
    {
        var e = document.createElement('input');
        e.type = 'button';
        html.setContent(e, txt);
        e.onclick = fnc;
        return e;
    },
    input: function(type, value, fnc, options)
    {
        if(type === 'tags')
        {
            var updateTags = function()
            {
                this.parentNode.setAttribute('data-value', util.forEach(this.parentNode.children, function(child)
                {
                    return child.classList.contains('tag') && child.classList.contains('selected') ? child.innerText : null;
                }).join(','));
            };
            var addTag = function(str, isSelected)
            {
                var key = options.getTagKey(str);
                if(!key)
                {
                    return;
                }
                
                var self = this;
                
                var children = this.parentNode.children;
                for(var i=0;i<children.length;++i)
                {
                    if(children[i].getAttribute('data-key') === key)
                    {
                        if(isSelected)
                        {
                            children[i].classList.add('selected');
                            updateTags.call(self);
                        }
                        return;
                    }
                }
                
                var tag = html.div('tag', util.trim(str));
                tag.setAttribute('data-key', key);
                if(isSelected)
                {
                    tag.classList.add('selected');
                }
                tag.onclick = function()
                {
                    if(this.classList.contains('selected'))
                    {
                        this.classList.remove('selected');
                    }
                    else
                    {
                        this.classList.add('selected');
                    }
                    updateTags.call(self);
                };
                this.parentNode.insertBefore(tag, this);
            };
            
            var tagsInput = html.div('tags-input', [
                html.input('text', '', function()
                {
                    if(this.value)
                    {
                        addTag.call(this, this.value, true);
                            
                        this.value = '';
                        
                        updateTags.call(this);
                    }
                }, {
                    onkeyup: function(e)
                    {
                        e = window.event || e;
                        
                        if(/,\s*$/gi.test(this.value))
                        {
                            var self = this;
                            setTimeout(function()
                            {
                                var parts = self.value.split(',');
                                if(parts.length > 1)
                                {
                                    var list = parts.slice(0, -1);
                                    for(var i=0;i<list.length;++i)
                                    {
                                        addTag.call(self, list[i], true);
                                    }
                                    
                                    self.value = util.trim(parts[parts.length - 1]);
                                    
                                    updateTags.call(self);
                                }
                            }, 0);
                        }
                        else if(e.keyCode === 13 && this.value)
                        {
                            addTag.call(this, this.value, true);
                            
                            this.value = '';
                            
                            updateTags.call(this);
                        }
                        else if(e.keyCode === 8 && !this.value)
                        {
                            // remove last tag
                            var tag = this.previousSibling;
                            if(tag && tag.parentNode)
                            {
                                tag.classList.remove('selected');
                                
                                updateTags.call(this);
                            }
                        }
                    }
                })
            ]);
            
            tagsInput.onclick = tagsInput.onfocus = function()
            {
                tagsInput.lastChild.focus();
            };
            
            var values = (value || '').split(',');
            for(var i=0;i<values.length;++i)
            {
                addTag.call(tagsInput.lastChild, values[i]);
            }
            
            return tagsInput;
        }
        var e = html.element('input', value);
        e.type = type || 'text';
        e.onchange = fnc;
        
        if(options)
        {
            if(options.onkeydown)
            {
                e.onkeydown = options.onkeydown;
            }
            else if(options.onkeyup)
            {
                e.onkeyup = options.onkeyup;
            }
        }
        return e;
    },
    div: function(className, list)
    {
        if(Array.isArray(className))
        {
            list = className;
            className = '';
        }
        
        var e = document.createElement('div');
        e.className = className;
        html.setContent(e, list);
        return e;
    },
    toarray: function(elems)
    {
        if(Array.isArray(elems))
        {
            return elems;
        }
        return [elems];
    },
    dl: function(list)
    {
        return html.element('dl', list);
    },
    dt: function(list)
    {
        return html.element('dt', list);
    },
    dd: function(list)
    {
        return html.element('dd', list);
    },
    label: function(txt, list)
    {
        return html.props(html.element('label', (!list ? [] : Array.isArray(list) ? list : [list]).concat([html.element('span', txt)])), this);
    },
    props: function(elem, options)
    {
        if(elem && options)
        {
            util.merge(elem, options);
        }
        return elem;
    },
    element: function(tag, value)
    {
        var e = document.createElement(tag);
        html.setContent(e, value);
        return e;
    },
    tag: function(elem)
    {
        if(elem && elem.tagName)
        {
            return (elem.tagName + '').toLowerCase();
        }
        return '';
    },
    checkbox: function(label, checked, fnc)
    {
        var e = html.element('input');
        e.type = 'checkbox';
        e.onchange = function()
        {
            fnc(!!this.checked);
        };
        e.checked = !!checked;
        
        return html.label(label, e);
    },
    radio: function(groupname, label, checked, fnc)
    {
        var e = html.element('input');
        e.type = 'radio';
        e.name = groupname;
        e.onchange = function()
        {
            fnc(!!this.checked);
        };
        e.checked = !!checked;
        
        return html.label(label, e);
    },
    link: function(href, content)
    {
        var e = html.element('a');
        e.href = href;
        e.target = '_blank';
        html.setContent(e, content);
        return e;
    }
};
