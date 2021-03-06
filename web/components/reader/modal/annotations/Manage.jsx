import {
  TabsContainer,
  TextField,
  ListItem,
  Button,
  List,
  Tabs,
  Tab
} from 'react-md';
import request from 'superagent';
import marked from 'marked';
import React from 'react';

// Constants
import { XYANNOTATIONS_URL } from 'constants/config';

// Components
import Navigation from 'components/reader/modal/Navigation';
import OpenWindow from 'components/misc/OpenWindow';

export default class ManageAnnotations extends React.Component {
  constructor(props) {
    super(props);

    const { Reader } = props;
    const { App } = Reader.props;

    this.state = {
      key: App.state.config.reader.xyAnnotationsKey,
      sets: [],
      set: 0,
      tab: 0
    };

    request
      .get(`${XYANNOTATIONS_URL}/api/sets`)
      .query({
        sort: 'top',
        bookTitle: Reader.state.book.title,
        direction: 'desc',
        bookSeries: '',
        bookAuthors: Reader.state.book.creator
      })
      .end((err, res) => !err && this.setState(res.body));
  }

  onSearch() {
    clearTimeout(this.searchTimeout);

    this.searchTimeout = setTimeout(
      () =>
        request
          .get(`${XYANNOTATIONS_URL}/api/sets`)
          .query({
            sort: 'top',
            direction: 'desc',
            search: this.refs.search.value
          })
          .end((err, res) => !err && this.setState(res.body)),
      200
    );
  }

  onDownload() {
    const { Reader } = this.props;
    const { annotations } = Reader.state.book;
    const set = this.state.sets.find(set => set.id == this.state.set);

    // Download set's items
    request
      .get(`${XYANNOTATIONS_URL}/api/sets/${set.id}/download`)
      .auth('subscription', this.state.key)
      .query({ minify: true })
      .end((err, res) => {
        if (err || !res.body.set || !res.body.set.items)
          return Reader.props.alert('Could not download set');

        set.items = res.body.set.items;
        set.version = res.body.set.version;

        const index = annotations.push(set) - 1;
        Reader._updateBook({ annotations });

        this.setState({ set: 0 });

        Reader.onSetHighlightMode({ mode: 'annotations', index });
      });
  }

  onDelete() {
    const { Reader } = this.props;
    const annotations = Reader.state.book.annotations.filter(
      a => a.id != this.state.set
    );

    // Remove set from book.annotations
    Reader._updateBook({ annotations });

    this.setState({ set: 0 });

    if (annotations.length)
      Reader.onSetHighlightMode({ mode: 'annotations', index: 0 });
    else Reader.onSetHighlightMode({ mode: 'none' });
  }

  onGetSet(id) {
    request.get(`${XYANNOTATIONS_URL}/api/sets/${id}`).end((err, res) => {
      if (err) return;

      const sets = this.state.sets.map(set => {
        if (set.id == id) return Object.assign({}, set, res.body);
        return set;
      });

      this.setState({ set: id, sets });
    });
  }

  _renderView(annotations) {
    const isDownloaded = !!annotations.find(a => a.id == this.state.set);
    const set = isDownloaded
      ? annotations.find(a => a.id == this.state.set)
      : this.state.sets.find(a => a.id == this.state.set);

    return (
      <section className="manage-annotations view-set">
        <Navigation
          {...this.props}
          title="Annotations"
          actions={[
            <Button
              icon
              onClick={() => this.setState({ set: 0 })}
              iconChildren="search"
            />,
            isDownloaded ? (
              <Button
                icon
                onClick={() => this.onDelete()}
                iconChildren="delete"
              />
            ) : (
              <Button
                icon
                onClick={() => this.onDownload()}
                iconChildren="cloud_download"
              />
            )
          ]}
        />

        <div className="set">
          <h2 className="title">{set.title}</h2>

          <p className="summary">{set.summary}</p>

          <ul className="books">
            {set.media.books.map(b => (
              <li className="book" key={b.id}>
                <span className="title">{b.title}</span> by{' '}
                <span className="creator">{b.creator}</span>
              </li>
            ))}
          </ul>

          <div
            className="summary"
            dangerouslySetInnerHTML={{
              __html: marked(set.description || '', { sanitize: true })
            }}
          />
        </div>
      </section>
    );
  }

  _renderDiscover() {
    if (!this.state.key)
      return (
        <p>
          <strong>Note:</strong> You have not set a{' '}
          <OpenWindow href="https://annotations.xyfir.com/">
            xyAnnotations
          </OpenWindow>{' '}
          subscription key. If you have a key, you can set it in your{' '}
          <a href="#/settings/reader">reader settings</a>.
        </p>
      );
    else
      return (
        <div className="discover flex">
          <TextField
            id="search"
            ref="search"
            type="search"
            label="Search"
            onChange={e => this.onSearch()}
            className="md-cell"
          />

          <ul className="sets">
            {this.state.sets.map(s => (
              <li
                key={s.id}
                onClick={() => this.onGetSet(s.id)}
                className="set"
              >
                <span className="title">{s.title}</span>

                {s.media.books.length ? (
                  <span className="book">
                    Linked to{' '}
                    <span className="title">{s.media.books[0].title}</span> by{' '}
                    <span className="creator">{s.media.books[0].creator}</span>
                    {s.media.books.length > 1
                      ? ` and ${s.media.books.length - 1} more`
                      : ''}
                  </span>
                ) : null}

                <span className="summary">{s.summary}</span>
              </li>
            ))}
          </ul>
        </div>
      );
  }

  _renderDownloaded(annotations) {
    return (
      <List>
        {annotations.map(a => (
          <ListItem
            threeLines
            key={a.id}
            onClick={() => this.setState({ set: a.id })}
            primaryText={a.title}
            secondaryText={
              `Contains ${a.items.length} annotations` + '\n' + a.summary
            }
          />
        ))}
      </List>
    );
  }

  render() {
    const { annotations } = this.props.Reader.state.book;

    if (this.state.set) return this._renderView(annotations);

    return (
      <section className="manage-annotations container">
        <Navigation {...this.props} title="Annotations" />

        <TabsContainer
          colored
          className="manage-annotations find"
          onTabChange={i => this.setState({ tab: i })}
          activeTabIndex={this.state.tab}
        >
          <Tabs tabId="tab">
            <Tab label="Discover">
              {this.state.tab == 0 ? this._renderDiscover() : null}
            </Tab>

            <Tab label="Downloaded">
              {this.state.tab == 1 ? this._renderDownloaded(annotations) : null}
            </Tab>
          </Tabs>
        </TabsContainer>
      </section>
    );
  }
}
